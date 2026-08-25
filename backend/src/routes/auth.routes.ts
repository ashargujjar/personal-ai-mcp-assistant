import { Router } from "express";
import { login, signup } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { loginSchema, signupSchema } from "../schema/auth.schema";
import { authLimiter } from "@/middleware/rateLimit";
const router = Router();

router.post("/signup", authLimiter, validate(signupSchema), signup);
router.post("/login", authLimiter, validate(loginSchema), login);

export default router;
