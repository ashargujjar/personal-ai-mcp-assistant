import type { NextFunction, Request, Response } from "express";
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import { AppError } from "../middleware/errorHandler";
import type { CreateEventInput } from "@/schema/calendar.schema";
import { prisma } from "@/db/connect";

const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const REDIRECT_URI =
  process.env.CALENDAR_REDIRECT_URI ?? "http://localhost:4000/api/calendar/callback";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

function buildOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    REDIRECT_URI,
  );
}

async function getCalendarClientForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.calendarRefreshToken) {
    throw new AppError("Calendar is not connected for this account", 400);
  }

  const client = buildOAuthClient();
  client.setCredentials({
    access_token: user.calendarAccessToken ?? undefined,
    refresh_token: user.calendarRefreshToken,
    expiry_date: user.calendarTokenExpiry?.getTime(),
  });

  client.on("tokens", async (tokens) => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        calendarAccessToken: tokens.access_token ?? user.calendarAccessToken,
        calendarTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : user.calendarTokenExpiry,
      },
    });
  });

  return google.calendar({ version: "v3", auth: client });
}

export async function calendarStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({ data: { connected: Boolean(user?.calendarRefreshToken) } });
  } catch (err) {
    next(err);
  }
}

export async function connectCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);

    const state = jwt.sign({ userId: req.user.id }, JWT_SECRET, { expiresIn: "10m" });
    const client = buildOAuthClient();
    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: CALENDAR_SCOPES,
      state,
    });

    res.json({ data: { url } });
  } catch (err) {
    next(err);
  }
}

export async function calendarCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, state } = req.query;
    if (typeof code !== "string" || typeof state !== "string") {
      throw new AppError("Missing code or state", 400);
    }

    const { userId } = jwt.verify(state, JWT_SECRET) as { userId: string };

    const client = buildOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      throw new AppError(
        "Google did not return a refresh token — try disconnecting Calendar access in your Google account and reconnecting",
        400,
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        calendarAccessToken: tokens.access_token,
        calendarRefreshToken: tokens.refresh_token,
        calendarTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    res.redirect(`${FRONTEND_URL}/tool-permissions?calendar=connected`);
  } catch (err) {
    next(err);
  }
}

export async function disconnectCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (user?.calendarRefreshToken) {
      const client = buildOAuthClient();
      await client.revokeToken(user.calendarRefreshToken).catch(() => {
        // Token may already be invalid/expired on Google's side — proceed to clear it locally regardless.
      });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { calendarAccessToken: null, calendarRefreshToken: null, calendarTokenExpiry: null },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function listEvents(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const calendar = await getCalendarClientForUser(req.user.id);

    const list = await calendar.events.list({
      calendarId: "primary",
      maxResults: 10,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = (list.data.items ?? []).map((e) => ({
      id: e.id,
      title: e.summary,
      start: e.start?.dateTime ?? e.start?.date,
      end: e.end?.dateTime ?? e.end?.date,
      location: e.location,
      attendees: (e.attendees ?? []).map((a) => a.email),
    }));

    res.json({ data: events });
  } catch (err) {
    next(err);
  }
}

export async function getEvent(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const calendar = await getCalendarClientForUser(req.user.id);

    const detail = await calendar.events.get({ calendarId: "primary", eventId: req.params.id });
    const e = detail.data;

    res.json({
      data: {
        id: e.id,
        title: e.summary,
        description: e.description,
        start: e.start?.dateTime ?? e.start?.date,
        end: e.end?.dateTime ?? e.end?.date,
        location: e.location,
        attendees: (e.attendees ?? []).map((a) => a.email),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createEvent(
  req: Request<unknown, unknown, CreateEventInput>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const calendar = await getCalendarClientForUser(req.user.id);

    const { title, description, start, end, attendees } = req.body;
    const result = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: title,
        description,
        start: { dateTime: start },
        end: { dateTime: end },
        attendees: attendees?.map((email) => ({ email })),
      },
    });

    res.status(201).json({ data: { id: result.data.id } });
  } catch (err) {
    next(err);
  }
}

export async function deleteEvent(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const calendar = await getCalendarClientForUser(req.user.id);

    await calendar.events.delete({ calendarId: "primary", eventId: req.params.id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
