import { z } from "zod";

export const chatSchema = z.object({
  body: z.object({
    chatText: z
      .string()
      .min(1, "chatText is required")
      .max(300, "chatText must be 4000 characters or fewer"),
    threadId: z.string().min(1, "threadId is required"),
  }),
});

export type ChatInput = z.infer<typeof chatSchema>["body"];
