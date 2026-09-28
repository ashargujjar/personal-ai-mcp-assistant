import { Job, Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import {
  GITHUB_REVIEW_QUEUE_NAME,
  PROCESS_GITHUB_REVIEW_JOB,
} from "../queues/github.queue";
import type { GitHubRepositoryReviewJob } from "../queues/github.types";
import {
  createGitHubWorkspace,
  removeGitHubWorkspace,
} from "../services/github-workspace.service";
import {
  cloneGitHubRepository,
  getClonedRepositoryCommitSha,
} from "../services/github-clone.service";
import { prisma } from "../db/connect";
import { cleanupRepositoryForScan } from "../services/github-repository-cleanup.service";
import { classifyRepositoryFiles } from "../services/github-file-classification.service";
import {
  chunkLoadedRepositoryFiles,
  loadPreparedRepositoryFiles,
  prepareGitHubRepositoryForAnalysis,
} from "../services/github-analyzer-preparation.service";
import { sendGitHubRepositoryToAnalyzer } from "../services/github-analyzer.service";

const worker = new Worker<GitHubRepositoryReviewJob>(
  GITHUB_REVIEW_QUEUE_NAME,
  async (job: Job<GitHubRepositoryReviewJob>) => {
    if (job.name !== PROCESS_GITHUB_REVIEW_JOB) {
      throw new Error(`Unsupported GitHub job: ${job.name}`);
    }

    await removeGitHubWorkspace(job.data.reviewId);
    const workspacePath = await createGitHubWorkspace(job.data.reviewId);
    await cloneGitHubRepository(job.data.repositoryUrl, workspacePath);
    const commitSha = await getClonedRepositoryCommitSha(workspacePath);
    const cleanupSummary = await cleanupRepositoryForScan(workspacePath);
    const fileClassification = await classifyRepositoryFiles(workspacePath);

    await prisma.repositoryManifest.upsert({
      where: { reviewId: job.data.reviewId },
      create: {
        reviewId: job.data.reviewId,
        repositoryId: job.data.repositoryId,
        repositoryUrl: job.data.repositoryUrl,
        owner: job.data.owner,
        repository: job.data.repository,
        commitSha,
        fileCount: fileClassification.files.length,
        sourceFileCount: fileClassification.counts.source,
        configFileCount: fileClassification.counts.configuration,
        documentationFileCount: fileClassification.counts.documentation,
        testFileCount: fileClassification.counts.test,
        manifestFileCount: fileClassification.counts["dependency-manifest"],
        unknownFileCount: fileClassification.counts.unknown,
        files: fileClassification.files,
      },
      update: {
        repositoryId: job.data.repositoryId,
        repositoryUrl: job.data.repositoryUrl,
        owner: job.data.owner,
        repository: job.data.repository,
        commitSha,
        fileCount: fileClassification.files.length,
        sourceFileCount: fileClassification.counts.source,
        configFileCount: fileClassification.counts.configuration,
        documentationFileCount: fileClassification.counts.documentation,
        testFileCount: fileClassification.counts.test,
        manifestFileCount: fileClassification.counts["dependency-manifest"],
        unknownFileCount: fileClassification.counts.unknown,
        files: fileClassification.files,
      },
    });

    const preparedRepository = await prepareGitHubRepositoryForAnalysis(
      job.data.reviewId,
      workspacePath,
    );
    const loadedRepository = await loadPreparedRepositoryFiles(preparedRepository);
    const chunkedRepository = chunkLoadedRepositoryFiles(
      loadedRepository,
      job.data.repositoryId,
    );
    const analyzerResult = await sendGitHubRepositoryToAnalyzer({
      reviewId: job.data.reviewId,
      repositoryId: job.data.repositoryId,
      repositoryUrl: job.data.repositoryUrl,
      owner: job.data.owner,
      repository: job.data.repository,
      commitSha,
      chunks: chunkedRepository.manifest.chunks,
    });

    await prisma.gitHubFinding.deleteMany({
      where: { reviewId: job.data.reviewId },
    });

    await prisma.gitHubFinding.createMany({
      data: (analyzerResult.findings ?? []).map((finding: {
        category: string;
        severity: string;
        title: string;
        summary: string;
        filePath: string;
        lineStart?: number | null;
        lineEnd?: number | null;
        recommendation: string;
        evidenceChunkIds?: string[];
      }) => ({
        reviewId: job.data.reviewId,
        category: finding.category,
        severity: finding.severity,
        title: finding.title,
        summary: finding.summary,
        filePath: finding.filePath,
        lineStart: finding.lineStart ?? null,
        lineEnd: finding.lineEnd ?? null,
        recommendation: finding.recommendation,
        evidenceChunkIds: finding.evidenceChunkIds ?? [],
      })),
    });

    await prisma.gitHubReview.update({
      where: { id: job.data.reviewId },
      data: {
        status: "COMPLETED",
      },
    });

    console.log(
      `[github-review-worker] clone succeeded repository=${job.data.owner}/${job.data.repository} commit=${commitSha} workspace=${workspacePath} removed_dirs=${cleanupSummary.removedDirectories} removed_files=${cleanupSummary.removedFiles} classified_files=${fileClassification.files.length}`,
    );

    return {
      repositoryId: job.data.repositoryId,
      workspacePath,
      cloneStatus: "success",
      commitSha,
      cleanupSummary,
      fileClassification,
      preparedFileCount: preparedRepository.manifest.files.length,
      loadedFileCount: loadedRepository.manifest.files.length,
      chunkCount: chunkedRepository.manifest.chunks.length,
      summarizedChunkCount: chunkedRepository.manifest.chunks.filter((chunk) => Boolean(chunk.summary)).length,
      analyzerResult,
    };
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

worker.on("completed", (job) => {
  console.log(`[github-review-worker] completed job ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`[github-review-worker] failed job ${job?.id}`, error);
  if (!job) return;

  void prisma.gitHubReview.update({
    where: { id: job.data.reviewId },
    data: { status: "FAILED" },
  }).catch((updateError) => {
    console.error(
      `[github-review-worker] failed to mark review=${job.data.reviewId} as failed`,
      updateError,
    );
  });
});

async function shutdown() {
  await worker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log(`[github-review-worker] listening queue=${GITHUB_REVIEW_QUEUE_NAME}`);
