import { readdir } from "node:fs/promises";
import path from "node:path";

export type GitHubFileCategory =
  | "source"
  | "configuration"
  | "documentation"
  | "test"
  | "dependency-manifest"
  | "unknown";

export interface ClassifiedGitHubFile {
  path: string;
  category: GitHubFileCategory;
}

export interface GitHubFileClassificationSummary {
  files: ClassifiedGitHubFile[];
  counts: Record<GitHubFileCategory, number>;
}

const sourceExtensions = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".h",
  ".hpp",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".swift",
  ".ts",
  ".tsx",
  ".vue",
]);

const configurationFiles = new Set([
  ".dockerignore",
  ".editorconfig",
  ".env.example",
  ".eslintrc",
  ".gitignore",
  ".prettierrc",
  "dockerfile",
  "makefile",
  "tsconfig.json",
  "vite.config.ts",
  "webpack.config.js",
]);

const dependencyManifests = new Set([
  "cargo.toml",
  "composer.json",
  "go.mod",
  "gemfile",
  "package.json",
  "pom.xml",
  "pyproject.toml",
  "requirements.txt",
]);

function categoryForFile(fileName: string): GitHubFileCategory {
  const lowerName = fileName.toLowerCase();
  const extension = path.extname(lowerName);

  if (
    lowerName.includes("test") ||
    lowerName.includes("spec") ||
    lowerName.endsWith(".snap")
  ) {
    return "test";
  }
  if (dependencyManifests.has(lowerName)) return "dependency-manifest";
  if (configurationFiles.has(lowerName) || lowerName.startsWith(".env")) {
    return "configuration";
  }
  if (
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".mdx") ||
    lowerName.endsWith(".rst") ||
    lowerName === "changelog" ||
    lowerName === "license"
  ) {
    return "documentation";
  }
  if (sourceExtensions.has(extension)) return "source";
  return "unknown";
}

async function collectFiles(
  directoryPath: string,
  workspacePath: string,
  files: ClassifiedGitHubFile[],
): Promise<void> {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(entryPath, workspacePath, files);
      continue;
    }
    if (!entry.isFile()) continue;

    files.push({
      path: path.relative(workspacePath, entryPath),
      category: categoryForFile(entry.name),
    });
  }
}

export async function classifyRepositoryFiles(
  workspacePath: string,
): Promise<GitHubFileClassificationSummary> {
  const files: ClassifiedGitHubFile[] = [];
  await collectFiles(workspacePath, workspacePath, files);

  const counts: Record<GitHubFileCategory, number> = {
    source: 0,
    configuration: 0,
    documentation: 0,
    test: 0,
    "dependency-manifest": 0,
    unknown: 0,
  };

  for (const file of files) {
    counts[file.category] += 1;
  }

  return { files, counts };
}
