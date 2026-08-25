import { Router } from "express";
import { login, signup } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { loginSchema, signupSchema } from "../schema/auth.schema";

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);

export default router;
