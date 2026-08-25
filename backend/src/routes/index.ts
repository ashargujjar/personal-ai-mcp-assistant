import { Router } from "express";
import authRoutes from "./auth.routes";
import memoryRoutes from "./memory.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/memory", memoryRoutes);

export default router;
