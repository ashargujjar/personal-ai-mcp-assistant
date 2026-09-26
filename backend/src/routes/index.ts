import documentRoutes from "./document.routes";
import { Router } from "express";
import authRoutes from "./auth.routes";
import calendarRoutes from "./calendar.routes";
import chatRoutes from "./chat.routes";
import gmailRoutes from "./gmail.routes";
import githubRoutes from "./github.routes";
import memoryRoutes from "./memory.routes";
import resumeRoutes from "./resume.routes";
import taskRoutes from "./task.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/memory", memoryRoutes);
router.use("/chat", chatRoutes);
router.use("/gmail", gmailRoutes);
router.use("/github", githubRoutes);
router.use("/calendar", calendarRoutes);
router.use("/tasks", taskRoutes);
router.use("/documents", documentRoutes);
router.use("/resume-searches", resumeRoutes);

export default router;
