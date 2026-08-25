import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/connect";
import { AppError } from "../middleware/errorHandler";
import type {
  CreateMemoryInput,
  SearchMemoryInput,
  UpdateMemoryInput,
} from "../schema/memory.schema";

type MemorySearchRow = {
  id: string;
  type: string;
  key: string | null;
  content: string;
  metadata: unknown;
  createdAt: Date;
  distance: number;
};

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

async function setEmbedding(id: string, embedding: number[]) {
  await prisma.$executeRaw`UPDATE memories SET embedding = ${toVectorLiteral(embedding)}::vector WHERE id = ${id}`;
}

async function findOwnedMemory(id: string, userId: string) {
  const memory = await prisma.memory.findUnique({ where: { id } });
  if (!memory || memory.userId !== userId) {
    throw new AppError("Memory not found", 404);
  }
  return memory;
}

export async function createMemory(
  req: Request<unknown, unknown, CreateMemoryInput>,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { type, key, content, metadata, embedding } = req.body;

    const memory = await prisma.memory.create({
      data: { userId: req.user.id, type, key, content, metadata },
    });

    if (embedding) {
      await setEmbedding(memory.id, embedding);
    }

    res.status(201).json({ data: { ...memory, hasEmbedding: Boolean(embedding) } });
  } catch (err) {
    next(err);
  }
}

export async function updateMemory(
  req: Request<{ id: string }, unknown, UpdateMemoryInput>,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = req.params;
    await findOwnedMemory(id, req.user.id);

    const { type, key, content, metadata, embedding } = req.body;

    const memory = await prisma.memory.update({
      where: { id },
      data: {
        type,
        key,
        content,
        metadata: metadata === null ? Prisma.JsonNull : metadata,
      },
    });

    if (embedding) {
      await setEmbedding(id, embedding);
    }

    res.json({ data: { ...memory, hasEmbedding: Boolean(embedding) } });
  } catch (err) {
    next(err);
  }
}

export async function deleteMemory(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = req.params;
    await findOwnedMemory(id, req.user.id);

    await prisma.memory.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function searchMemory(
  req: Request<unknown, unknown, SearchMemoryInput>,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { embedding, limit, type } = req.body;
    const vectorLiteral = toVectorLiteral(embedding);

    const rows = type
      ? await prisma.$queryRaw<MemorySearchRow[]>`
          SELECT id, type, key, content, metadata, "createdAt",
                 embedding <=> ${vectorLiteral}::vector AS distance
          FROM memories
          WHERE "userId" = ${req.user.id} AND type = ${type} AND embedding IS NOT NULL
          ORDER BY distance ASC
          LIMIT ${limit}
        `
      : await prisma.$queryRaw<MemorySearchRow[]>`
          SELECT id, type, key, content, metadata, "createdAt",
                 embedding <=> ${vectorLiteral}::vector AS distance
          FROM memories
          WHERE "userId" = ${req.user.id} AND embedding IS NOT NULL
          ORDER BY distance ASC
          LIMIT ${limit}
        `;

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}
