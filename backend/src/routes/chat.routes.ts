import { Router } from "express";
import { chatAssistant } from "../controllers/user.controller";
import { chatLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";
import { chatSchema } from "@/schema/chat.schema";
import { requireAuth } from "@/middleware/requireAuth";
const router = Router();

router.post("/", chatLimiter, requireAuth, validate(chatSchema), chatAssistant);

export default router;
