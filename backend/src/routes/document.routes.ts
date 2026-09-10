import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  deleteDocument,
  downloadDocument,
  handleDocumentUploadError,
  listDocuments,
  uploadDocument,
} from "../controllers/document.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);
router.get("/", listDocuments);
router.post(
  "/",
  rateLimit({ windowMs: 60000, limit: 10 }),
  express.raw({ type: "application/pdf", limit: "20mb" }),
  uploadDocument,
);
router.get("/:id/download", downloadDocument);
router.delete("/:id", deleteDocument);
router.use(handleDocumentUploadError);

export default router;
