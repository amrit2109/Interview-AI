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
  const client = new S3Client({
    region,
    ...(endpoint && { endpoint }),
    credentials: { accessKeyId, secretAccessKey },
    ...(endpoint?.startsWith("https://") && { forcePathStyle: false }),
    requestHandler: new NodeHttpHandler({
      httpsAgent,
      connectionTimeout: 10_000,
      requestTimeout: 120_000,
    }),
  });
  return { client, bucket, region, publicBaseUrl };
}

const { client, bucket, region, publicBaseUrl } = getStorageConfig();

export function isStorageConfigured(): boolean {
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
