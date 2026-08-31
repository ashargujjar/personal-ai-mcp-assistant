import { Router } from "express";
import {
  createMemory,
  deleteMemory,
  getMemoryByKey,
  listMemory,
  searchMemory,
  updateMemory,
} from "../controllers/memory.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import {
  createMemorySchema,
  listMemorySchema,
  memoryIdParamSchema,
  searchMemorySchema,
  updateMemorySchema,
} from "../schema/memory.schema";

const router = Router();

router.use(requireAuth);
router.get("/", validate(listMemorySchema), listMemory);
router.post("/", validate(createMemorySchema), createMemory);
router.post("/search", validate(searchMemorySchema), searchMemory);
router.get("/key/:key", getMemoryByKey);
router.put("/:id", validate(updateMemorySchema), updateMemory);
router.delete("/:id", validate(memoryIdParamSchema), deleteMemory);

export default router;
