import { z } from "zod";

export const chatSchema = z.object({
  body: z
    .object({
      chatText: z
        .string()
        .min(1, "chatText is required")
        .max(300, "chatText must be 4000 characters or fewer")
        .optional(),
      threadId: z.string().min(1, "threadId is required"),
      timezone: z.string().optional(),
      resume: z
        .object({
          type: z.enum(["accept", "reject", "edit"]),
          message: z.string().optional(),
        })
        .optional(),
    })
    .refine((data) => data.chatText || data.resume, {
      message: "chatText or resume is required",
    }),
});

export type ChatInput = z.infer<typeof chatSchema>["body"];
