import { z } from "zod";

const githubRepositoryUrl = z
  .string()
  .trim()
  .url("repositoryUrl must be a valid URL")
  .superRefine((value, ctx) => {
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      return;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    const isGitHubHost = url.hostname.toLowerCase() === "github.com" || url.hostname.toLowerCase() === "www.github.com";
    const hasRepositoryPath = segments.length === 2 && segments.every((segment) => segment.trim().length > 0);

    if (url.protocol !== "https:") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "repositoryUrl must use HTTPS" });
    }
    if (!isGitHubHost) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "repositoryUrl must point to github.com" });
    }
    if (!hasRepositoryPath) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "repositoryUrl must use the format https://github.com/owner/repository" });
    }
    if (url.search || url.hash) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "repositoryUrl must not contain a query string or fragment" });
    }
  });

export const reviewRepositorySchema = z.object({
  body: z.object({
    repositoryUrl: githubRepositoryUrl,
  }),
});

export type ReviewRepositoryInput = z.infer<typeof reviewRepositorySchema>["body"];
