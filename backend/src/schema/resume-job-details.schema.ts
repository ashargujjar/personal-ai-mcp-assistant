import { z } from "zod";

const optionalStringArray = z
  .array(z.string().trim().min(1))
  .optional();

export const resumeJobDetailsDataSchema = z.object({
  title: z.string().trim().max(200).optional(),
  requiredSkills: optionalStringArray,
  preferredSkills: optionalStringArray,
  minimumExperience: z.number().int().nonnegative().optional(),
  maximumExperience: z.number().int().nonnegative().optional(),
  education: z.string().trim().max(1000).optional(),
  responsibilities: optionalStringArray,
  location: z.string().trim().max(200).optional(),
  employmentType: z.string().trim().max(100).optional(),
  seniority: z.string().trim().max(100).optional(),
  certifications: optionalStringArray,
  languages: optionalStringArray,
  notes: z.string().trim().max(10000).optional(),
    rawExtractedData: z.record(z.unknown()).optional(),
});

export const resumeJobDetailsSchema = z.object({
  body: resumeJobDetailsDataSchema.extend({
    jobId: z.string().trim().min(1, "jobId is required"),
  }),
});

export type ResumeJobDetailsInput = z.infer<
  typeof resumeJobDetailsSchema
>["body"];
export type ResumeJobDetailsDataInput = z.infer<
  typeof resumeJobDetailsDataSchema
>;
