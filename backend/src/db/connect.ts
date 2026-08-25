import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("[db] connected to PostgreSQL");
  } catch (err) {
    console.error("[db] failed to connect to PostgreSQL", err);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
}
