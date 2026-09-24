import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatDeepSeek } from "@langchain/deepseek";
import { z } from "zod";
import { prisma } from "../db/connect";
import {
  resumeJobDetailsDataSchema,
  type ResumeJobDetailsDataInput,
} from "../schema/resume-job-details.schema";

const stringArray = z.array(z.string().trim().min(1)).default([]);

export const structuredResumeDataSchema = z.object({
  name: z.string().trim().max(200).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  skills: stringArray,
  experienceYears: z.number().int().nonnegative().nullable().optional(),
  experienceSummary: z.string().trim().max(3000).default(""),
  education: z.string().trim().max(1000).nullable().optional(),
  certifications: stringArray,
  languages: stringArray,
  jobTitles: stringArray,
  responsibilities: stringArray,
  projects: stringArray,
});

export type StructuredResumeData = z.output<
  typeof structuredResumeDataSchema
>;

export const atsComparisonInputSchema = z.object({
  job: z.object({
    title: z.string().default(""),
    requiredSkills: stringArray,
    preferredSkills: stringArray,
    minimumExperience: z.number().int().nonnegative().nullable().optional(),
    maximumExperience: z.number().int().nonnegative().nullable().optional(),
    education: z.string().nullable().optional(),
    responsibilities: stringArray,
    location: z.string().nullable().optional(),
    employmentType: z.string().nullable().optional(),
    seniority: z.string().nullable().optional(),
    certifications: stringArray,
    languages: stringArray,
    notes: z.string().nullable().optional(),
  }),
  candidate: structuredResumeDataSchema,
});

export type AtsComparisonInput = z.output<
  typeof atsComparisonInputSchema
>;

export const atsComparisonResultSchema = z.object({
  matchScore: z.number().int().min(0).max(100),
  matchedSkills: stringArray,
  missingSkills: stringArray,
  strengths: stringArray,
  gaps: stringArray,
  relevantProjects: stringArray,
  experienceSummary: z.string().trim().max(3000).default(""),
  education: z.string().trim().max(1000).nullable().optional(),
  reasoning: z.string().trim().max(3000).default(""),
});

export type AtsComparisonResult = z.output<
  typeof atsComparisonResultSchema
>;

export interface ResumeAtsScore {
  resumeData: StructuredResumeData;
  comparisonInput: AtsComparisonInput;
  comparison: AtsComparisonResult;
}

function modelName() {
  return process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
}

function apiKey() {
  return process.env.DEEPSEEK_KEY ?? process.env.DEEPSEEK_API_KEY;
}

function baseUrl() {
  return process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
}

function storedFullText(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";

  const fullText = (value as { fullText?: unknown }).fullText;
  return typeof fullText === "string" ? fullText.trim() : "";
}

export async function getStoredResumeJobDetails(
  searchId: string,
  userId: string,
): Promise<ResumeJobDetailsDataInput> {
  const search = await prisma.resumeSearch.findFirst({
    where: {
      id: searchId,
      userId,
    },
    select: {
      jobTitle: true,
      description: true,
      jobDetails: true,
    },
  });

  if (!search) {
    throw new Error("Resume search not found for ATS scan");
  }

  const storedDetails = search.jobDetails;
  if (!storedDetails) {
    return {
      title: search.jobTitle,
      notes: search.description ?? undefined,
    };
  }

  const parsed = resumeJobDetailsDataSchema.safeParse({
    title: storedDetails.title ?? search.jobTitle,
    requiredSkills: storedDetails.requiredSkills ?? undefined,
    preferredSkills: storedDetails.preferredSkills ?? undefined,
    minimumExperience: storedDetails.minimumExperience ?? undefined,
    maximumExperience: storedDetails.maximumExperience ?? undefined,
    education: storedDetails.education ?? undefined,
    responsibilities: storedDetails.responsibilities ?? undefined,
    location: storedDetails.location ?? undefined,
    employmentType: storedDetails.employmentType ?? undefined,
    seniority: storedDetails.seniority ?? undefined,
    certifications: storedDetails.certifications ?? undefined,
    languages: storedDetails.languages ?? undefined,
    notes: storedDetails.notes ?? search.description ?? undefined,
    rawExtractedData: storedDetails.rawExtractedData ?? undefined,
  });

  if (!parsed.success) {
    throw new Error("Stored resume job details are invalid");
  }

  return parsed.data;
}

export async function getStoredResumeText(
  searchId: string,
  applicantId: string,
  userId: string,
): Promise<string> {
  const applicant = await prisma.resumeApplicant.findFirst({
    where: {
      id: applicantId,
      searchId,
      userId,
    },
    select: {
      pdfTextExtraction: true,
    },
  });

  if (!applicant) {
    throw new Error("Resume applicant not found for ATS scan");
  }

  const resumeText = storedFullText(applicant.pdfTextExtraction);
  if (!resumeText) {
    throw new Error("Stored resume PDF text is unavailable");
  }

  return resumeText;
}

export async function extractStructuredResumeData(
  resumeText: string,
): Promise<StructuredResumeData> {
  const cleanResumeText = resumeText.trim();
  if (!cleanResumeText) {
    throw new Error("Resume text is required for structured extraction");
  }

  const key = apiKey();
  if (!key) {
    throw new Error("ATS resume extraction model is not configured");
  }

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      [
        "Extract structured candidate data from the resume text.",
        "Return only facts that are explicitly present or strongly implied.",
        "Normalize skill names to short canonical names.",
        "If total years of experience is unclear, leave experienceYears null.",
        "Keep responsibilities concise and focused on work the candidate performed.",
      ].join(" "),
    ],
    ["user", "Resume text:\n\n{resumeText}"],
  ]);

  const model = new ChatDeepSeek({
    apiKey: key,
    model: modelName(),
    temperature: 0,
    configuration: {
      baseURL: baseUrl(),
    },
  }).withStructuredOutput(structuredResumeDataSchema, {
    name: "structured_resume_data",
  });

  const chain = prompt.pipe(model);
  const result = await chain.invoke({
    resumeText: cleanResumeText.slice(0, 50000),
  });

  return structuredResumeDataSchema.parse(result);
}

export function combineStructuredResumeData(
  jobDetails: ResumeJobDetailsDataInput,
  resumeData: StructuredResumeData,
): AtsComparisonInput {
  return atsComparisonInputSchema.parse({
    job: {
      title: jobDetails.title ?? "",
      requiredSkills: jobDetails.requiredSkills ?? [],
      preferredSkills: jobDetails.preferredSkills ?? [],
      minimumExperience: jobDetails.minimumExperience ?? null,
      maximumExperience: jobDetails.maximumExperience ?? null,
      education: jobDetails.education ?? null,
      responsibilities: jobDetails.responsibilities ?? [],
      location: jobDetails.location ?? null,
      employmentType: jobDetails.employmentType ?? null,
      seniority: jobDetails.seniority ?? null,
      certifications: jobDetails.certifications ?? [],
      languages: jobDetails.languages ?? [],
      notes: jobDetails.notes ?? null,
    },
    candidate: resumeData,
  });
}

export async function compareResumeAgainstJob(
  input: AtsComparisonInput,
): Promise<AtsComparisonResult> {
  const key = apiKey();
  if (!key) {
    throw new Error("ATS comparison model is not configured");
  }

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      [
        "Compare the candidate profile against the job requirements for ATS screening.",
        "Return a fair, evidence-based structured result.",
        "Prioritize required skills, relevant experience, responsibilities, education, certifications, languages, and project relevance.",
        "Use gaps only for meaningful missing or weak requirements.",
        "Keep strengths and gaps concise.",
      ].join(" "),
    ],
    [
      "user",
      [
        "Job requirements JSON:",
        "{job}",
        "",
        "Candidate profile JSON:",
        "{candidate}",
      ].join("\n"),
    ],
  ]);

  const model = new ChatDeepSeek({
    apiKey: key,
    model: modelName(),
    temperature: 0,
    configuration: {
      baseURL: baseUrl(),
    },
  }).withStructuredOutput(atsComparisonResultSchema, {
    name: "resume_ats_comparison",
  });

  const chain = prompt.pipe(model);
  const result = await chain.invoke({
    job: JSON.stringify(input.job, null, 2),
    candidate: JSON.stringify(input.candidate, null, 2),
  });

  return atsComparisonResultSchema.parse(result);
}

export async function scoreResumeAgainstJob(
  jobDetails: ResumeJobDetailsDataInput,
  resumeText: string,
): Promise<ResumeAtsScore> {
  const resumeData = await extractStructuredResumeData(resumeText);
  const comparisonInput = combineStructuredResumeData(jobDetails, resumeData);
  const comparison = await compareResumeAgainstJob(comparisonInput);

  return {
    resumeData,
    comparisonInput,
    comparison,
  };
}
