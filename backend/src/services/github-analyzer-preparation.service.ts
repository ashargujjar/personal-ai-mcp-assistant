import path from "node:path";
import { readFile } from "node:fs/promises";
import { prisma } from "../db/connect";
import { AppError } from "../middleware/errorHandler";

interface ManifestFile {
  path: string;
  category: string;
}

export interface PreparedRepositoryFile {
  relativePath: string;
  absolutePath: string;
  category: string;
}

export interface LoadedRepositoryFile extends PreparedRepositoryFile {
  language: string;
  content: string;
}

export interface RepositoryCodeChunk {
  chunkId: string;
  reviewId: string;
  repositoryId: number;
  commitSha: string;
  filePath: string;
  fileCategory: string;
  language: string;
  chunkIndex: number;
  totalChunks: number;
  startLine: number;
  endLine: number;
  summary: string;
  content: string;
}

export interface PreparedGitHubRepository {
  review: {
    id: string;
    repositoryUrl: string;
    owner: string;
    repository: string;
    status: string;
  };
  manifest: {
    id: string;
    commitSha: string;
    files: PreparedRepositoryFile[];
  };
}

export interface LoadedGitHubRepository extends Omit<PreparedGitHubRepository, "manifest"> {
  manifest: {
    id: string;
    commitSha: string;
    files: LoadedRepositoryFile[];
  };
}

export interface ChunkedGitHubRepository extends Omit<LoadedGitHubRepository, "manifest"> {
  manifest: {
    id: string;
    commitSha: string;
    files: LoadedRepositoryFile[];
    chunks: RepositoryCodeChunk[];
  };
}

function manifestFiles(value: unknown): ManifestFile[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (file): file is ManifestFile =>
      typeof file === "object" &&
      file !== null &&
      typeof (file as ManifestFile).path === "string" &&
      typeof (file as ManifestFile).category === "string",
  );
}

function detectLanguage(filePath: string): string {
  const fileName = path.basename(filePath).toLowerCase();
  const extension = path.extname(fileName);

  const fileNameLanguages: Record<string, string> = {
    ".env.example": "env",
    "dockerfile": "dockerfile",
    "gemfile": "ruby",
    "makefile": "makefile",
    "package.json": "json",
    "requirements.txt": "pip-requirements",
  };

  if (fileNameLanguages[fileName]) return fileNameLanguages[fileName];

  const extensionLanguages: Record<string, string> = {
    ".c": "c",
    ".cc": "cpp",
    ".cpp": "cpp",
    ".cs": "csharp",
    ".css": "css",
    ".go": "go",
    ".h": "c",
    ".hpp": "cpp",
    ".html": "html",
    ".java": "java",
    ".js": "javascript",
    ".jsx": "javascript-react",
    ".json": "json",
    ".kt": "kotlin",
    ".md": "markdown",
    ".mdx": "mdx",
    ".php": "php",
    ".prisma": "prisma",
    ".py": "python",
    ".rb": "ruby",
    ".rs": "rust",
    ".scss": "scss",
    ".sh": "shell",
    ".sql": "sql",
    ".swift": "swift",
    ".toml": "toml",
    ".ts": "typescript",
    ".tsx": "typescript-react",
    ".vue": "vue",
    ".yaml": "yaml",
    ".yml": "yaml",
  };

  return extensionLanguages[extension] ?? "unknown";
}

export async function prepareGitHubRepositoryForAnalysis(
  reviewId: string,
  workspacePath: string,
): Promise<PreparedGitHubRepository> {
  const review = await prisma.gitHubReview.findUnique({
    where: { id: reviewId },
    include: { manifest: true },
  });

  if (!review) throw new AppError("GitHub review not found", 404);
  if (!review.manifest) throw new AppError("Repository manifest not found", 409);

  const resolvedWorkspacePath = path.resolve(workspacePath);
  const files = manifestFiles(review.manifest.files).map((file) => {
    const absolutePath = path.resolve(resolvedWorkspacePath, file.path);
    const relativePath = path.relative(resolvedWorkspacePath, absolutePath);

    if (
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath)
    ) {
      throw new AppError(`Manifest path escapes repository workspace: ${file.path}`, 400);
    }

    return {
      relativePath: file.path,
      absolutePath,
      category: file.category,
    };
  });

  return {
    review: {
      id: review.id,
      repositoryUrl: review.repositoryUrl,
      owner: review.owner,
      repository: review.repository,
      status: review.status,
    },
    manifest: {
      id: review.manifest.id,
      commitSha: review.manifest.commitSha,
      files,
    },
  };
}

export async function loadPreparedRepositoryFiles(
  preparedRepository: PreparedGitHubRepository,
): Promise<LoadedGitHubRepository> {
  const files = await Promise.all(
    preparedRepository.manifest.files.map(async (file) => ({
      ...file,
      language: detectLanguage(file.relativePath),
      content: await readFile(file.absolutePath, "utf8"),
    })),
  );

  return {
    review: preparedRepository.review,
    manifest: {
      id: preparedRepository.manifest.id,
      commitSha: preparedRepository.manifest.commitSha,
      files,
    },
  };
}

const MAX_CHUNK_CHARACTERS = 10000;
const CHUNK_OVERLAP_LINES = 8;

function isLogicalBoundary(line: string, language: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  if (
    trimmed.startsWith("import ") ||
    trimmed.startsWith("export ") ||
    trimmed.startsWith("#include ") ||
    trimmed.startsWith("require(")
  ) {
    return true;
  }

  if (
    /^(export\s+)?(default\s+)?(async\s+)?function\b/.test(trimmed) ||
    /^(export\s+)?(abstract\s+)?class\b/.test(trimmed) ||
    /^(export\s+)?interface\b/.test(trimmed) ||
    /^(export\s+)?type\b/.test(trimmed) ||
    /^(public|private|protected|static|async)?\s*\w+\s*\([^)]*\)\s*[{:]?$/.test(trimmed)
  ) {
    return true;
  }

  if (language === "python" && /^(async\s+)?(def|class)\s+/.test(trimmed)) {
    return true;
  }

  if (
    trimmed.startsWith("[") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("server") ||
    trimmed.startsWith("services") ||
    trimmed.startsWith("steps")
  ) {
    return true;
  }

  return false;
}

function splitFileIntoBlocks(file: LoadedRepositoryFile): Array<{
  startLine: number;
  endLine: number;
  content: string;
}> {
  const lines = file.content.split(/\r?\n/);
  const blocks: Array<{ startLine: number; endLine: number; content: string }> = [];
  let blockStart = 0;

  for (let index = 1; index < lines.length; index += 1) {
    const currentBlock = lines.slice(blockStart, index).join("\n");
    if (
      isLogicalBoundary(lines[index], file.language) &&
      currentBlock.length >= 120
    ) {
      blocks.push({
        startLine: blockStart + 1,
        endLine: index,
        content: currentBlock,
      });
      blockStart = index;
    }
  }

  if (blockStart < lines.length || lines.length === 0) {
    blocks.push({
      startLine: blockStart + 1,
      endLine: Math.max(blockStart + 1, lines.length),
      content: lines.slice(blockStart).join("\n"),
    });
  }

  return blocks;
}

function enforceChunkSize(
  block: { startLine: number; endLine: number; content: string },
): Array<{ startLine: number; endLine: number; content: string }> {
  if (block.content.length <= MAX_CHUNK_CHARACTERS) return [block];

  const lines = block.content.split(/\r?\n/);
  const chunks: Array<{ startLine: number; endLine: number; content: string }> = [];
  let start = 0;

  while (start < lines.length) {
    let end = start;
    let size = 0;

    while (end < lines.length && (size + lines[end].length + 1 <= MAX_CHUNK_CHARACTERS || end === start)) {
      size += lines[end].length + 1;
      end += 1;
    }

    chunks.push({
      startLine: block.startLine + start,
      endLine: block.startLine + end - 1,
      content: lines.slice(start, end).join("\n"),
    });

    if (end >= lines.length) break;
    start = Math.max(start + 1, end - CHUNK_OVERLAP_LINES);
  }

  return chunks;
}

function summarizeChunk(chunk: Omit<RepositoryCodeChunk, "summary">): string {
  const lines = chunk.content.split(/\r?\n/);
  const imports = lines.filter((line) => /^\s*(import|from|require|#include)\b/.test(line)).length;
  const functions = lines.filter((line) =>
    /^\s*(export\s+)?(async\s+)?function\b/.test(line) ||
    /^\s*(async\s+)?def\s+/.test(line) ||
    /^\s*(public|private|protected|static|async)?\s*\w+\s*\([^)]*\)\s*[{:]?$/.test(line),
  ).length;
  const classes = lines.filter((line) => /^\s*(export\s+)?(abstract\s+)?class\b/.test(line)).length;
  const interfaces = lines.filter((line) => /^\s*(export\s+)?(interface|type)\b/.test(line)).length;
  const hasConfigShape = lines.some((line) => /^\s*(\[.*\]|[A-Za-z_][\w-]*\s*[:=])/.test(line));

  const characteristics: string[] = [];
  if (imports > 0) characteristics.push(`${imports} import${imports === 1 ? "" : "s"}`);
  if (functions > 0) characteristics.push(`${functions} function${functions === 1 ? "" : "s"}`);
  if (classes > 0) characteristics.push(`${classes} class${classes === 1 ? "" : "es"}`);
  if (interfaces > 0) characteristics.push(`${interfaces} type/interface declaration${interfaces === 1 ? "" : "s"}`);
  if (hasConfigShape) characteristics.push("configuration or structured values");

  const purposeByCategory: Record<string, string> = {
    source: "application source code",
    configuration: "repository configuration",
    documentation: "documentation",
    test: "tests or test support code",
    "dependency-manifest": "dependency and package metadata",
    unknown: "repository content",
  };

  const purpose = purposeByCategory[chunk.fileCategory] ?? "repository content";
  const detail = characteristics.length > 0 ? ` It contains ${characteristics.join(", ")}.` : "";

  return `This chunk contains ${purpose} in ${chunk.language} from ${chunk.filePath}, covering lines ${chunk.startLine}-${chunk.endLine}.${detail}`;
}

export function chunkLoadedRepositoryFiles(
  repository: LoadedGitHubRepository,
  repositoryId: number,
): ChunkedGitHubRepository {
  const chunks: RepositoryCodeChunk[] = [];

  for (const file of repository.manifest.files) {
    const blocks = splitFileIntoBlocks(file).flatMap(enforceChunkSize);
    const totalChunks = blocks.length;

    blocks.forEach((block, index) => {
      const chunk = {
        chunkId: `${repository.review.id}-${file.relativePath}-${index}`,
        reviewId: repository.review.id,
        repositoryId,
        commitSha: repository.manifest.commitSha,
        filePath: file.relativePath,
        fileCategory: file.category,
        language: file.language,
        chunkIndex: index,
        totalChunks,
        startLine: block.startLine,
        endLine: block.endLine,
        content: block.content,
      };

      chunks.push({
        ...chunk,
        summary: summarizeChunk(chunk),
      });
    });
  }

  return {
    review: repository.review,
    manifest: {
      ...repository.manifest,
      chunks,
    },
  };
}
