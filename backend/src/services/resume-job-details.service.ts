import { ChatDeepSeek } from "@langchain/deepseek";
import {
  resumeJobDetailsDataSchema,
  type ResumeJobDetailsDataInput,
} from "../schema/resume-job-details.schema";

const extractionSchema = resumeJobDetailsDataSchema
  .omit({ rawExtractedData: true })
  .describe("Structured details extracted from a job description.");

function modelName() {
  return process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
}

function apiKey() {
  return process.env.DEEPSEEK_KEY ?? process.env.DEEPSEEK_API_KEY;
}

function baseUrl() {
  return process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
}

export async function extractResumeJobDetails(
  jobTitle: string,
  description?: string | null,
): Promise<ResumeJobDetailsDataInput> {
  const cleanDescription = description?.trim();
  if (!cleanDescription) {
    return { title: jobTitle };
  }

  const key = apiKey();
  if (!key) {
    return { title: jobTitle, notes: cleanDescription };
  }

  const model = new ChatDeepSeek({
    apiKey: key,
    model: modelName(),
    temperature: 0,
    configuration: {
      baseURL: baseUrl(),
    },
  }).withStructuredOutput(extractionSchema, {
    name: "resume_job_details",
  });

  const extracted = await model.invoke([
    [
      "system",
      [
        "Extract structured job requirements from the user's job description.",
        "Return only fields that are clearly present or strongly implied.",
        "Keep skills as short canonical names.",
        "If the description conflicts with the provided title, keep the provided title.",
      ].join(" "),
    ],
    [
      "user",
      [
        `Provided job title: ${jobTitle}`,
        "Job description:",
        cleanDescription,
      ].join("\n\n"),
    ],
  ]);

  return {
    ...extracted,
    title: jobTitle,
    rawExtractedData: { ...extracted },
  };
}
