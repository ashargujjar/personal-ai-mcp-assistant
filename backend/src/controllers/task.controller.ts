import type { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import type { CreateTaskInput, UpdateTaskInput } from "@/schema/task.schema";
import { prisma } from "@/db/connect";

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);

    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: tasks });
  } catch (err) {
    next(err);
  }
}

export async function getTask(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);

    const task = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!task) throw new AppError("Task not found", 404);

    res.json({ data: task });
  } catch (err) {
    next(err);
  }
}

export async function createTask(
  req: Request<unknown, unknown, CreateTaskInput>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);

    const { title, description, priority, deadline, project, source, status } = req.body;
    const task = await prisma.task.create({
      data: {
        userId: req.user.id,
        title,
        description,
        priority,
        deadline: deadline ? new Date(deadline) : undefined,
        project,
        source,
        status,
      },
    });

    res.status(201).json({ data: task });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(
  req: Request<{ id: string }, unknown, UpdateTaskInput>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);

    const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) throw new AppError("Task not found", 404);

    const { title, description, priority, deadline, project, source, status } = req.body;
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        priority,
        deadline: deadline ? new Date(deadline) : undefined,
        project,
        source,
        status,
      },
    });

    res.json({ data: task });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);

    const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) throw new AppError("Task not found", 404);

    await prisma.task.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
