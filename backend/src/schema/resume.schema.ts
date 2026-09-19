import { z } from "zod";

const resumeSearchIdParams = z.object({
  params: z.object({
    id: z.string().min(1, "id is required"),
  }),
});

export const createResumeSearchSchema = z.object({
  body: z.object({
    jobTitle: z.string().trim().min(1, "job title is required").max(200),
    description: z.string().trim().max(10000).optional(),
    dateFrom: z.string().date(),
    dateTo: z.string().date(),
  }),
});

export const updateResumeSearchSchema = z.object({
  ...resumeSearchIdParams.shape,
  body: z
    .object({
      jobTitle: z.string().trim().min(1).max(200).optional(),
      description: z.string().trim().max(10000).nullable().optional(),
      dateFrom: z.string().date().optional(),
      dateTo: z.string().date().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
});

export const resumeSearchIdSchema = resumeSearchIdParams;

export type CreateResumeSearchInput = z.infer<typeof createResumeSearchSchema>["body"];
export type UpdateResumeSearchInput = z.infer<typeof updateResumeSearchSchema>["body"];
