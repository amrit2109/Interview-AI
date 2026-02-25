/**
 * S3-compatible storage for interview recordings.
 * Server-only. Never expose credentials to client.
 */

import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import https from "node:https";
import { getEnv } from "@/lib/env";

/** TLS 1.2 minimum to avoid handshake failure with Cloudflare R2 on some Node/Windows builds. */
const httpsAgent = new https.Agent({
  minVersion: "TLSv1.2",
  maxVersion: "TLSv1.3",
  keepAlive: true,
});

function getStorageConfig(): {
  client: S3Client | null;
  bucket: string | undefined;
  region: string;
  publicBaseUrl: string | undefined;
} {
  const env = getEnv();
  const endpoint = env.S3_ENDPOINT;
  const region = env.S3_REGION ?? "us-east-1";
  const bucket = env.S3_BUCKET;
  const accessKeyId = env.S3_ACCESS_KEY_ID;
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY;
  const publicBaseUrl = env.S3_PUBLIC_BASE_URL;

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return { client: null, bucket: undefined, region, publicBaseUrl };
  }
  const normalizedEndpoint = endpoint
    ? (() => {
        let u = endpoint.replace(/\/$/, "");
        if (bucket && u.endsWith("/" + bucket)) {
          u = u.slice(0, -(bucket.length + 1));
        }
        return u || undefined;
      })()
    : undefined;
  const client = new S3Client({
    region,
    ...(normalizedEndpoint && { endpoint: normalizedEndpoint }),
    credentials: { accessKeyId, secretAccessKey },
    ...(normalizedEndpoint?.startsWith("https://") && { forcePathStyle: false }),
    requestHandler: new NodeHttpHandler({
      httpsAgent,
      connectionTimeout: 10_000,
      requestTimeout: 120_000,
    }),
  });
  return { client, bucket, region, publicBaseUrl };
}

/** Lazy config to avoid calling getEnv() at module load (breaks Vercel build when DATABASE_URL not set). */
let cachedConfig: ReturnType<typeof getStorageConfig> | null = null;

function getCachedStorageConfig() {
  if (cachedConfig === null) {
    cachedConfig = getStorageConfig();
  }
  return cachedConfig;
}

export function isStorageConfigured(): boolean {
  const { client, bucket } = getCachedStorageConfig();
  return !!client && !!bucket;
}

export function getRecordingObjectKey(token: string): string {
  const safe = token.replace(/[^a-zA-Z0-9_-]/g, "_");
  const ts = Date.now();
  return `recordings/${safe}/${ts}.webm`;
}

/** Prefix for object keys belonging to this token. Used to validate client-provided objectKey. */
export function getRecordingPrefixForToken(token: string): string {
  const safe = token.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `recordings/${safe}/`;
}

/** Sanitize string for use in object key path (resumes folder). */
function sanitizeForKey(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "unknown";
}

/** Allowed MIME types and extensions for resume uploads. Reuse in API validation. */
export const RESUME_ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
export const RESUME_ALLOWED_EXTENSIONS = [".pdf", ".txt", ".doc", ".docx"] as const;

/** Extension from content type for resume files. */
const RESUME_EXT_MAP: Record<string, string> = {
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export function getResumeObjectKey(
  emailOrId: string,
  contentType: string
): string {
  const safe = sanitizeForKey(emailOrId);
  const ext = RESUME_EXT_MAP[contentType] ?? "pdf";
  const ts = Date.now();
  return `resumes/${safe}/${ts}.${ext}`;
}

/**
 * Upload resume body from server to R2 under resumes/ prefix.
 */
export async function uploadResumeFromServer(
  emailOrId: string,
  body: ArrayBuffer | Buffer | Uint8Array,
  contentType: string
): Promise<{ data: { objectKey: string; finalUrl: string } | null; error: string | null }> {
  const { client, bucket, region, publicBaseUrl } = getCachedStorageConfig();
  if (!client || !bucket) {
    return {
      data: null,
      error: "Storage not configured. Set S3_* environment variables.",
    };
  }
  const objectKey = getResumeObjectKey(emailOrId, contentType);
  const finalUrl = publicBaseUrl
    ? `${publicBaseUrl.replace(/\/$/, "")}/${objectKey}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: body instanceof ArrayBuffer ? new Uint8Array(body) : body,
        ContentType: contentType,
      })
    );
    return { data: { objectKey, finalUrl }, error: null };
  } catch (err) {
    console.error("uploadResumeFromServer:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }
}

export interface PresignedUploadResult {
  uploadUrl: string;
  objectKey: string;
  finalUrl: string;
  expiresIn: number;
}

export async function createPresignedUploadUrl(
  token: string,
  contentType = "video/webm"
): Promise<{ data: PresignedUploadResult | null; error: string | null }> {
  const { client, bucket, region, publicBaseUrl } = getCachedStorageConfig();
  if (!client || !bucket) {
    return {
      data: null,
      error: "Storage not configured. Set S3_* environment variables.",
    };
  }

  const objectKey = getRecordingObjectKey(token);
  const finalUrl = publicBaseUrl
    ? `${publicBaseUrl.replace(/\/$/, "")}/${objectKey}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: contentType,
    });
    const expiresIn = 900; // 15 min
    const uploadUrl = await getSignedUrl(client, command, { expiresIn });
    return {
      data: { uploadUrl, objectKey, finalUrl, expiresIn },
      error: null,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Failed to create upload URL.";
    console.error("createPresignedUploadUrl:", err);
    return {
      data: null,
      error: errMsg,
    };
  }
}

/**
 * Upload recording body from server to R2 (avoids browser PUT / SSL issues).
 */
export async function uploadRecordingFromServer(
  token: string,
  body: ArrayBuffer | Buffer | Uint8Array,
  contentType = "video/webm"
): Promise<{ data: { objectKey: string; finalUrl: string } | null; error: string | null }> {
  const { client, bucket, region, publicBaseUrl } = getCachedStorageConfig();
  if (!client || !bucket) {
    return {
      data: null,
      error: "Storage not configured. Set S3_* environment variables.",
    };
  }
  const objectKey = getRecordingObjectKey(token);
  const finalUrl = publicBaseUrl
    ? `${publicBaseUrl.replace(/\/$/, "")}/${objectKey}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: body instanceof ArrayBuffer ? new Uint8Array(body) : body,
        ContentType: contentType,
      })
    );
    return { data: { objectKey, finalUrl }, error: null };
  } catch (err) {
    console.error("uploadRecordingFromServer:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }
}

export async function verifyObjectExists(
  objectKey: string
): Promise<{ exists: boolean; error?: string }> {
  const { client, bucket } = getCachedStorageConfig();
  if (!client || !bucket) {
    return { exists: false, error: "Storage not configured." };
  }
  try {
    await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: objectKey })
    );
    return { exists: true };
  } catch (err) {
    if (err && typeof err === "object" && "name" in err && err.name === "NotFound") {
      return { exists: false };
    }
    console.error("verifyObjectExists:", err);
    return { exists: false, error: err instanceof Error ? err.message : "Failed to verify." };
  }
}
