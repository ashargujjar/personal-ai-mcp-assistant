import { Router } from "express";
import {
  createResumeSearch,
  deleteResumeSearch,
  getResumeSearch,
  listResumeSearches,
  storeResumePdfTextExtraction,
  updateResumeSearch,
} from "../controllers/resume.controller";
import { runResumeAtsScan } from "../controllers/resume-scan.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import {
  createResumeSearchSchema,
  resumePdfTextExtractionSchema,
  resumeSearchIdSchema,
  updateResumeSearchSchema,
} from "../schema/resume.schema";

const router = Router();

router.use(requireAuth);
router.get("/", listResumeSearches);
router.post("/", validate(createResumeSearchSchema), createResumeSearch);
router.post("/:id/ats-scan", validate(resumeSearchIdSchema), runResumeAtsScan);
router.get("/:id", validate(resumeSearchIdSchema), getResumeSearch);
router.post(
  "/applicants/:applicantId/pdf-text-extraction",
  validate(resumePdfTextExtractionSchema),
  storeResumePdfTextExtraction,
);
router.patch("/:id", validate(updateResumeSearchSchema), updateResumeSearch);
router.delete("/:id", validate(resumeSearchIdSchema), deleteResumeSearch);

export default router;
