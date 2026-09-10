import { z } from "zod";

export const documentMetadataSchema = z.object({
  filename: z.string().trim().min(1).max(255).regex(/\.pdf$/i),
  title: z.string().trim().max(500).optional(),
  author: z.string().trim().max(255).optional(),
  language: z.string().trim().max(35).optional(),
});

export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;
