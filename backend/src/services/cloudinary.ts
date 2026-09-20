import { createHash } from "node:crypto";
import { AppError } from "../middleware/errorHandler";
function config() {
  const cloud =
    process.env.CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_NAME;
  const key = process.env.CLOUDINARY_API_KEY ?? process.env.CLOUDINARY_API;
  const secret =
    process.env.CLOUDINARY_API_SECRET ?? process.env.CLOUDINARY_SECRET;
  if (!cloud || !key || !secret)
    throw new AppError("Document storage is not configured", 503);
  return { cloud, key, secret };
}

async function request(
  action: string,
  parameters: Record<string, string>,
  file?: Buffer,
) {
  const { cloud, key, secret } = config();
  const params = {
    ...parameters,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const signature = createHash("sha256")
    .update(
      Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("&") + secret,
    )
    .digest("hex");
  const body = new FormData();
  for (const [k, v] of Object.entries(params)) body.append(k, v);
  body.append("api_key", key);
  body.append("signature", signature);
  if (file)
    body.append(
      "file",
      new Blob([new Uint8Array(file)], { type: "application/pdf" }),
      "document.pdf",
    );
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/raw/${action}`,
    { method: "POST", body, signal: AbortSignal.timeout(60000) },
  );
  const result = (await response.json()) as {
    public_id?: string;
    result?: string;
    error?: unknown;
  };
  if (!response.ok || result.error)
    throw new AppError("Document storage request failed", 502);
  return result;
}

export async function uploadPdf(file: Buffer, publicId: string) {
  const result = await request(
    "upload",
    { public_id: publicId, type: "authenticated", overwrite: "false" },
    file,
  );
  if (result.public_id !== publicId)
    throw new AppError("Unexpected storage response", 502);
}

export async function uploadResumePdf(file: Buffer, publicId: string) {
  await uploadPdf(file, publicId);

  return {
    publicId,
    url: downloadUrl(publicId),
  };
}
export async function deletePdf(publicId: string) {
  const result = await request("destroy", {
    public_id: publicId,
    type: "authenticated",
    invalidate: "true",
  });
  if (result.result !== "ok" && result.result !== "not found")
    throw new AppError("Document deletion failed", 502);
}

export function downloadUrl(publicId: string) {
  const { cloud, key, secret } = config();
  const params: Record<string, string> = {
    public_id: publicId,
    format: "pdf",
    timestamp: String(Math.floor(Date.now() / 1000)),
    expires_at: String(Math.floor(Date.now() / 1000) + 60),
    type: "authenticated",
    attachment: "true",
  };
  const signature = createHash("sha256")
    .update(
      Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("&") + secret,
    )
    .digest("hex");
  return `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/raw/download?${new URLSearchParams({ ...params, api_key: key, signature })}`;
}
