import { Router } from "express";
import authRoutes from "./auth.routes";
import calendarRoutes from "./calendar.routes";
import chatRoutes from "./chat.routes";
import gmailRoutes from "./gmail.routes";
import memoryRoutes from "./memory.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/memory", memoryRoutes);
router.use("/chat", chatRoutes);
router.use("/gmail", gmailRoutes);
router.use("/calendar", calendarRoutes);

export default router;
