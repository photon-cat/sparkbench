import { Client } from "minio";
import path from "path";

if (!process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
  throw new Error("MINIO_ACCESS_KEY and MINIO_SECRET_KEY environment variables are required");
}

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000", 10),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const BUCKET = process.env.MINIO_BUCKET || "sparkbench";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB
const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._\/-]*$/;

let bucketReady = false;

export async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BUCKET);
  }
  bucketReady = true;
}

function sanitizeFilename(filename: string): string {
  // Normalize and strip path traversal
  const normalized = path.posix.normalize(filename).replace(/^(\.\.\/)+/, "");
  if (!SAFE_FILENAME.test(normalized) || normalized.includes("..")) {
    throw new Error(`Invalid filename: ${filename}`);
  }
  return normalized;
}

function objectKey(projectId: string, filename: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    throw new Error(`Invalid project ID: ${projectId}`);
  }
  const safe = sanitizeFilename(filename);
  return `projects/${projectId}/${safe}`;
}

export async function uploadFile(
  projectId: string,
  filename: string,
  content: string | Buffer,
): Promise<void> {
  await ensureBucket();
  const buf = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
  if (buf.length > MAX_UPLOAD_SIZE) {
    throw new Error(`File too large (${buf.length} bytes). Maximum is ${MAX_UPLOAD_SIZE} bytes.`);
  }
  await minioClient.putObject(BUCKET, objectKey(projectId, filename), buf);
}

export async function downloadFile(
  projectId: string,
  filename: string,
): Promise<string | null> {
  await ensureBucket();
  try {
    const stream = await minioClient.getObject(BUCKET, objectKey(projectId, filename));
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  } catch (err: any) {
    if (err.code === "NoSuchKey" || err.code === "NotFound") return null;
    throw err;
  }
}

export async function deleteFile(
  projectId: string,
  filename: string,
): Promise<void> {
  await ensureBucket();
  await minioClient.removeObject(BUCKET, objectKey(projectId, filename));
}

export async function listProjectFiles(projectId: string): Promise<string[]> {
  await ensureBucket();
  const prefix = `projects/${projectId}/`;
  const files: string[] = [];
  const stream = minioClient.listObjects(BUCKET, prefix, true);
  for await (const item of stream) {
    if (item.name) {
      files.push(item.name.replace(prefix, ""));
    }
  }
  return files;
}

export async function copyProjectFiles(
  sourceId: string,
  destId: string,
): Promise<void> {
  await ensureBucket();
  const files = await listProjectFiles(sourceId);
  for (const filename of files) {
    const content = await downloadFile(sourceId, filename);
    if (content !== null) {
      await uploadFile(destId, filename, content);
    }
  }
}
