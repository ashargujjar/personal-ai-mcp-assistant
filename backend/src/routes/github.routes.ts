import { Router } from "express";
import { getReviewFindings, reviewRepository } from "../controllers/github.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import { reviewRepositorySchema } from "../schema/github.schema";

const router = Router();

router.use(requireAuth);
router.post("/reviews", validate(reviewRepositorySchema), reviewRepository);
router.get("/reviews/:id/findings", getReviewFindings);

export default router;
