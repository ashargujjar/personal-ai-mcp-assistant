import { Router } from "express";
import { googleLogin, login, signup } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { googleLoginSchema, loginSchema, signupSchema } from "../schema/auth.schema";
import { authLimiter } from "@/middleware/rateLimit";
const router = Router();

router.post("/signup", authLimiter, validate(signupSchema), signup);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/google", authLimiter, validate(googleLoginSchema), googleLogin);

export default router;
