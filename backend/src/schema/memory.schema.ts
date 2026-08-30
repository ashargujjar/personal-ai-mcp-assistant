import { z } from "zod";

const EMBEDDING_DIM = 1536;

const embeddingSchema = z
  .array(z.number())
  .length(
    EMBEDDING_DIM,
    `Embedding must have exactly ${EMBEDDING_DIM} dimensions`,
  );

export const createMemorySchema = z.object({
  body: z.object({
    type: z.string().min(1, "type is required"),
    key: z.string().min(1).nullable().optional(),
    content: z
      .string()
      .min(1, "content is required")
      .max(500, "content must be 500 characters or fewer"),
    metadata: z.record(z.any()).nullable().optional(),
    embedding: embeddingSchema.optional(),
  }),
});

export type CreateMemoryInput = z.infer<typeof createMemorySchema>["body"];

export const updateMemorySchema = z.object({
  params: z.object({
    id: z.string().min(1, "id is required"),
  }),
  body: z
    .object({
      type: z.string().min(1).optional(),
      key: z.string().min(1).nullable().optional(),
      content: z.string().min(1).max(500).optional(),
      metadata: z.record(z.any()).nullable().optional(),
      embedding: embeddingSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
});

export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>["body"];

export const memoryIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "id is required"),
  }),
});

export const searchMemorySchema = z.object({
  body: z.object({
    embedding: embeddingSchema,
    limit: z.number().int().positive().max(50).optional().default(4),
    type: z.string().min(1).optional(),
  }),
});

export type SearchMemoryInput = z.infer<typeof searchMemorySchema>["body"];

export const listMemorySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    q: z.string().min(1).optional(),
  }),
});

export type ListMemoryQuery = z.infer<typeof listMemorySchema>["query"];
