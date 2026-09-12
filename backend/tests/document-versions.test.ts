import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { prisma } from "../src/db/connect";
import {
  uploadDocument, listDocuments, downloadDocument, deleteDocument,
} from "../src/controllers/document.controller";

// Exercise real DB writes and controller authorization; never contact Cloudinary.
test("version-backed upload/list/download/delete and failure recovery", async () => {
  const token = randomUUID();
  const owner = `version-test-owner-${token}`;
  const stranger = `version-test-stranger-${token}`;
  const assets = new Set<string>();
  const originalFetch = globalThis.fetch;
  const originalConfig = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
    .map(key => [key, process.env[key]] as const);
  for (const [key] of originalConfig) process.env[key] = "test-only";
  let failDelete: string | undefined;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    assert.ok(url.startsWith("https://api.cloudinary.com/v1_1/test-only/raw/"));
    const key = String((init!.body as FormData).get("public_id"));
    if (url.endsWith("/upload")) {
      assets.add(key);
      return Response.json({ public_id: key });
    }
    assert.ok(url.endsWith("/destroy"));
    if (key === failDelete) return Response.json({ error: "temporary failure" }, { status: 503 });
    return Response.json({ result: assets.delete(key) ? "ok" : "not found" });
  };

  async function call(handler: Function, userId: string, id?: string) {
    const result: { status: number; body?: any; error?: any } = { status: 200 };
    const req = {
      user: { id: userId }, params: { id }, query: { filename: "handbook.pdf" },
      body: Buffer.from("%PDF-test"), is: () => true,
    };
    const res = {
      status(code: number) { result.status = code; return this; },
      json(body: unknown) { result.body = body; return this; },
      sendStatus(code: number) { result.status = code; return this; },
      setHeader() { return this; },
    };
    await handler(req, res, (error: unknown) => { result.error = error; });
    return result;
  }

  try {
    await prisma.user.createMany({ data: [owner, stranger].map(id => ({
      id, name: "Version test", email: `${id}@example.invalid`,
    })) });
    const upload = await call(uploadDocument, owner);
    assert.equal(upload.error, undefined);
    assert.equal(upload.status, 201);
    const doc = upload.body.data;
    assert.equal(doc.originalFilename, "handbook.pdf");
    assert.equal(doc.versionNumber, 1);
    assert.equal(doc.fileSize, 9);
    assert.equal(doc.status, "uploaded");
    assert.equal(await prisma.documentVersion.count({ where: { documentId: doc.id } }), 1);
    assert.equal(doc.ingestionStatus, "QUEUED");
    const job = await prisma.ingestionJob.findUniqueOrThrow({
      where: { id: doc.ingestionJobId }, include: { outboxEvents: true },
    });
    assert.equal(job.documentVersionId, doc.documentVersionId);
    assert.equal(job.pipelineVersion, "source-access-v1");
    assert.equal(job.stage, null);
    assert.equal(job.attemptCount, 0);
    assert.equal(job.maxAttempts, 3);
    assert.equal(job.claimToken, null);
    assert.equal(job.outboxEvents.length, 1);
    assert.equal(job.outboxEvents[0].dispatchedAt, null);
    assert.equal(job.outboxEvents[0].eventType, "ingestion.requested");
    assert.equal(job.outboxEvents[0].schemaVersion, 1);

    assert.equal((await call(listDocuments, owner)).body.data[0].id, doc.id);
    assert.equal((await call(listDocuments, owner)).body.data[0].ingestionJobId, job.id);
    assert.deepEqual((await call(listDocuments, stranger)).body.data, []);
    assert.ok((await call(downloadDocument, stranger, doc.id)).error);
    assert.ok((await call(deleteDocument, stranger, doc.id)).error);
    assert.equal(assets.size, 1);

    // Reject a final nested outbox write, proving its parent rows roll back too.
    const rollbackId = `rollback-${token}`;
    await assert.rejects(prisma.document.create({ data: {
      id: rollbackId, userId: owner, tenantId: owner,
      versions: { create: {
        versionNumber: 1, filename: "rollback.pdf", originalFilename: "rollback.pdf",
        storageKey: rollbackId, mimeType: "application/pdf", fileSize: 9, fileHash: "rollback",
        ingestionJobs: { create: {
          id: rollbackId, pipelineVersion: "source-access-v1",
          outboxEvents: { create: [{}, {}] },
        } },
      } },
    } }));
    assert.equal(await prisma.document.count({ where: { id: rollbackId } }), 0);
    assert.equal(await prisma.documentVersion.count({ where: { documentId: rollbackId } }), 0);
    assert.equal(await prisma.ingestionJob.count({ where: { id: rollbackId } }), 0);
    assert.equal(await prisma.outboxEvent.count({ where: { ingestionJobId: rollbackId } }), 0);
    assert.ok((await call(downloadDocument, owner, doc.id)).body.data.url.includes("test-only"));

    // A failed nested create must clean storage and leave no partial identity row.
    const countBefore = await prisma.document.count();
    assert.ok((await call(uploadDocument, `missing-${token}`)).error);
    assert.equal(await prisma.document.count(), countBefore);
    assert.equal(assets.size, 1);

    const secondKey = `test/${token}/v2.pdf`;
    assets.add(secondKey);
    await prisma.documentVersion.create({ data: {
      documentId: doc.id, versionNumber: 2, filename: "v2.pdf", originalFilename: "revised.pdf",
      storageKey: secondKey, mimeType: "application/pdf", fileSize: 12, fileHash: "second-hash",
    } });
    assert.equal((await call(listDocuments, owner)).body.data[0].originalFilename, "revised.pdf");
    const url = new URL((await call(downloadDocument, owner, doc.id)).body.data.url);
    assert.equal(url.searchParams.get("public_id"), secondKey);

    failDelete = secondKey;
    assert.ok((await call(deleteDocument, owner, doc.id)).error);
    assert.equal(await prisma.documentVersion.count({ where: { documentId: doc.id } }), 2);
    failDelete = undefined;
    assert.equal((await call(deleteDocument, owner, doc.id)).status, 204);
    assert.equal(await prisma.document.count({ where: { id: doc.id } }), 0);
    assert.equal(await prisma.documentVersion.count({ where: { documentId: doc.id } }), 0);
    assert.equal(await prisma.ingestionJob.count({ where: { id: job.id } }), 0);
    assert.equal(await prisma.outboxEvent.count({ where: { ingestionJobId: job.id } }), 0);
    assert.equal(assets.size, 0);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of originalConfig) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    // Only remove this test's generated records, including after an assertion fails.
    await prisma.$transaction(async tx => {
      await tx.documentVersion.deleteMany({ where: { document: { userId: { in: [owner, stranger] } } } });
      await tx.document.deleteMany({ where: { userId: { in: [owner, stranger] } } });
      await tx.user.deleteMany({ where: { id: { in: [owner, stranger] } } });
    });
    await prisma.$disconnect();
  }
});
