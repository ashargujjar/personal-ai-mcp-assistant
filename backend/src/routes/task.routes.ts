import { Router } from "express";
import { createTask, deleteTask, getTask, listTasks, updateTask } from "../controllers/task.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import { createTaskSchema, taskIdParamSchema, updateTaskSchema } from "../schema/task.schema";

const router = Router();

router.use(requireAuth);
router.get("/", listTasks);
router.get("/:id", validate(taskIdParamSchema), getTask);
router.post("/", validate(createTaskSchema), createTask);
router.patch("/:id", validate(updateTaskSchema), updateTask);
router.delete("/:id", validate(taskIdParamSchema), deleteTask);

export default router;
