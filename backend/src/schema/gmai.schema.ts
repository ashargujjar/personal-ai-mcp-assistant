import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z.object({
    to: z.string().email("to must be a valid email address"),
    subject: z.string().min(1, "subject is required").max(300),
    body: z.string().min(1, "body is required").max(20000),
  }),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>["body"];
export const messageIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "id is required"),
  }),
});
