import { z } from "zod";

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(1, "title is required").max(300),
    description: z.string().max(5000).optional(),
    start: z.string().min(1, "start is required"),
    end: z.string().min(1, "end is required"),
    attendees: z.array(z.string().email()).optional(),
  }),
});

export type CreateEventInput = z.infer<typeof createEventSchema>["body"];

export const eventIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "id is required"),
  }),
});
