import { z } from "zod";

const resumeSearchIdParams = z.object({
  params: z.object({
    id: z.string().min(1, "id is required"),
  }),
});

const pdfWordSchema = z
  .object({
    text: z.string(),
    x0: z.number(),
    top: z.number(),
    x1: z.number(),
    bottom: z.number(),
  })
  .passthrough();

const pdfPageSchema = z.object({
  pageNumber: z.number().int().positive(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  rawText: z.string(),
  words: z.array(pdfWordSchema),
  lines: z.array(z.unknown()),
  tables: z.array(z.unknown()),
});

export const resumePdfTextExtractionSchema = z.object({
  params: z.object({
    applicantId: z.string().min(1, "applicantId is required"),
  }),
  body: z.object({
    extraction: z.object({
      source: z.object({
        filename: z.string().min(1),
        pageCount: z.number().int().nonnegative(),
      }),
      pages: z.array(pdfPageSchema),
      fullText: z.string(),
    }),
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
export type ResumePdfTextExtractionInput = z.infer<
  typeof resumePdfTextExtractionSchema
>["body"];
export type ResumeApplicantContactInfo = z.infer<typeof resumeApplicantContactInfoSchema>;
export type StructuredResumeApplicant = z.infer<typeof structuredResumeApplicantSchema>;
