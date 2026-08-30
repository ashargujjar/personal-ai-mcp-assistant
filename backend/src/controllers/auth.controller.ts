import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/connect";
import type { LoginInput, SignupInput } from "../schema/auth.schema";
import { AppError } from "../middleware/errorHandler";
import { toSafeUser } from "../utils/user";
import { signToken } from "../utils/jwt";
import { OAuth2Client } from "google-auth-library";
import { User } from "@prisma/client";

const SALT_ROUNDS = 10;

export async function signup(
  req: Request<unknown, unknown, SignupInput>,
  res: Response,
  next: NextFunction,
) {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("A user with this email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });
    const token = signToken(user.id, user.email);

    res.status(201).json({ data: { user: toSafeUser(user), token } });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request<unknown, unknown, LoginInput>,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new Error("email or pasword");
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = signToken(user.id, user.email);

    res.json({ data: { user: toSafeUser(user), token } });
  } catch (err) {
    next(err);
  }
}
export async function googleLogin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      throw new AppError("idToken is required", 400);
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new AppError("Invalid Google token", 401);
    }

    const user = await prisma.user.findUnique({
      where: { googleId: payload.sub },
    });

    if (!user) {
      let savedUser: User | null = await prisma.user.findUnique({
        where: { email: payload.email },
      });

      if (!savedUser) {
        savedUser = await prisma.user.create({
          data: {
            email: payload.email,
            googleId: payload.sub,
            name: payload.name ?? payload.email,
          },
        });
      }

      const token = signToken(savedUser.id, savedUser.email);
      return res.json({ data: { user: toSafeUser(savedUser), token } });
    }

    const token = signToken(user.id, user.email);
    return res.json({ data: { user: toSafeUser(user), token } });
  } catch (err) {
    next(err);
  }
}
