import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";

function runGit(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const git = spawn("git", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";

    git.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    git.stderr.on("data", (chunk: Buffer) => {
      errorOutput += chunk.toString();
    });

    git.on("error", reject);
    git.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve(output.trim());
        return;
      }

      reject(
        new Error(
          `Git command failed${errorOutput ? `: ${errorOutput.trim()}` : ""}`,
        ),
      );
    });
  });
}

export async function cloneGitHubRepository(
  repositoryUrl: string,
  workspacePath: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const git = spawn(
      "git",
      [
        "clone",
        "--depth",
        "1",
        "--single-branch",
        "--no-tags",
        repositoryUrl,
        workspacePath,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let errorOutput = "";
    git.stderr.on("data", (chunk: Buffer) => {
      errorOutput += chunk.toString();
    });

    git.on("error", reject);
    git.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `GitHub repository clone failed${errorOutput ? `: ${errorOutput.trim()}` : ""}`,
        ),
      );
    });
  }).catch(async (error) => {
    await rm(workspacePath, { recursive: true, force: true });
    throw error;
  });
}

export function getClonedRepositoryCommitSha(workspacePath: string): Promise<string> {
  return runGit(["-C", workspacePath, "rev-parse", "HEAD"]);
}
