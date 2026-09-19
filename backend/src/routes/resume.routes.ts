import { Router } from "express";
import {
  createResumeSearch,
  deleteResumeSearch,
  getResumeSearch,
  listResumeSearches,
  updateResumeSearch,
} from "../controllers/resume.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import {
  createResumeSearchSchema,
  resumeSearchIdSchema,
  updateResumeSearchSchema,
} from "../schema/resume.schema";

const router = Router();

router.use(requireAuth);
router.get("/", listResumeSearches);
router.post("/", validate(createResumeSearchSchema), createResumeSearch);
router.get("/:id", validate(resumeSearchIdSchema), getResumeSearch);
router.patch("/:id", validate(updateResumeSearchSchema), updateResumeSearch);
router.delete("/:id", validate(resumeSearchIdSchema), deleteResumeSearch);

export default router;
