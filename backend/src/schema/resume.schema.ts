import { z } from "zod";

const resumeSearchIdParams = z.object({
  params: z.object({
    id: z.string().min(1, "id is required"),
  }),
});

export const resumeApplicantContactInfoSchema = z.object({
  name: z.string().trim().min(1).max(200).nullable().optional(),
  email: z.string().trim().email().max(320).nullable().optional(),
  phone: z.string().trim().min(1).max(50).nullable().optional(),
  address: z.string().trim().min(1).max(1000).nullable().optional(),
});

export const structuredResumeApplicantSchema = z.object({
  contactInfo: resumeApplicantContactInfoSchema.optional(),
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
export type ResumeApplicantContactInfo = z.infer<typeof resumeApplicantContactInfoSchema>;
export type StructuredResumeApplicant = z.infer<typeof structuredResumeApplicantSchema>;
