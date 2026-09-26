import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const MAX_FILE_SIZE_BYTES = Number(process.env.GITHUB_SCAN_MAX_FILE_BYTES ?? 1024 * 1024);

const removableDirectories = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".parcel-cache",
  ".svelte-kit",
  ".turbo",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "tmp",
  "vendor",
]);

const removableExtensions = new Set([
  ".7z",
  ".avi",
  ".bin",
  ".bmp",
  ".bz2",
  ".class",
  ".dll",
  ".dmg",
  ".doc",
  ".docx",
  ".DS_Store",
  ".eot",
  ".exe",
  ".gif",
  ".gz",
  ".ico",
  ".jar",
  ".jpeg",
  ".jpg",
  ".lockb",
  ".map",
  ".mov",
  ".mp3",
  ".mp4",
  ".o",
  ".ogg",
  ".otf",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".rar",
  ".so",
  ".sqlite",
  ".tar",
  ".tgz",
  ".ttf",
  ".wasm",
  ".wav",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".xls",
  ".xlsx",
  ".zip",
]);

interface CleanupSummary {
  removedDirectories: number;
  removedFiles: number;
  removedLargeFiles: number;
}

async function cleanupDirectory(directoryPath: string, summary: CleanupSummary): Promise<void> {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (removableDirectories.has(entry.name)) {
        await rm(entryPath, { recursive: true, force: true });
        summary.removedDirectories += 1;
        continue;
      }

      await cleanupDirectory(entryPath, summary);
      continue;
    }

    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name).toLowerCase();
    if (removableExtensions.has(extension)) {
      await rm(entryPath, { force: true });
      summary.removedFiles += 1;
      continue;
    }

    const fileStat = await stat(entryPath);
    if (fileStat.size > MAX_FILE_SIZE_BYTES) {
      await rm(entryPath, { force: true });
      summary.removedFiles += 1;
      summary.removedLargeFiles += 1;
    }
  }
}

export async function cleanupRepositoryForScan(workspacePath: string): Promise<CleanupSummary> {
  const summary: CleanupSummary = {
    removedDirectories: 0,
    removedFiles: 0,
    removedLargeFiles: 0,
  };

  await cleanupDirectory(workspacePath, summary);
  return summary;
}
