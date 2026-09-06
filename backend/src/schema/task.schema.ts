import { z } from "zod";

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const STATUSES = ["todo", "in-progress", "waiting", "done"] as const;
const SOURCES = ["email", "meeting", "github", "manual", "ai", "calendar", "document", "conversation"] as const;

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, "title is required").max(300),
    description: z.string().max(5000).optional(),
    priority: z.enum(PRIORITIES).optional(),
    deadline: z.string().optional(),
    project: z.string().max(200).optional(),
    source: z.enum(SOURCES).optional(),
    status: z.enum(STATUSES).optional(),
  }),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>["body"];

export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().min(1, "id is required"),
  }),
  body: z
    .object({
      title: z.string().min(1).max(300).optional(),
      description: z.string().max(5000).optional(),
      priority: z.enum(PRIORITIES).optional(),
      deadline: z.string().optional(),
      project: z.string().max(200).optional(),
      source: z.enum(SOURCES).optional(),
      status: z.enum(STATUSES).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required" }),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>["body"];

export const taskIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "id is required"),
  }),
});
