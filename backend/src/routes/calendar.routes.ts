import { Router } from "express";
import {
  calendarCallback,
  calendarStatus,
  connectCalendar,
  createEvent,
  deleteEvent,
  disconnectCalendar,
  getEvent,
  listEvents,
} from "../controllers/calendar.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import { createEventSchema, eventIdParamSchema } from "../schema/calendar.schema";

const router = Router();

// No requireAuth here — Google redirects the browser directly, with no Authorization header.
// The user is identified via the signed `state` param instead.
router.get("/callback", calendarCallback);

router.use(requireAuth);
router.get("/status", calendarStatus);
router.get("/connect", connectCalendar);
router.delete("/disconnect", disconnectCalendar);
router.get("/events", listEvents);
router.get("/events/:id", validate(eventIdParamSchema), getEvent);
router.post("/events", validate(createEventSchema), createEvent);
router.delete("/events/:id", validate(eventIdParamSchema), deleteEvent);

export default router;
