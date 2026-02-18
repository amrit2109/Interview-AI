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

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION ?? "us-east-1";
const bucket = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

/** TLS 1.2 minimum to avoid handshake failure with Cloudflare R2 on some Node/Windows builds. */
const httpsAgent = new https.Agent({
  minVersion: "TLSv1.2",
  maxVersion: "TLSv1.3",
  keepAlive: true,
});

function getClient(): S3Client | null {
  if (!bucket || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
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
}

const client = getClient();

export function isStorageConfigured(): boolean {
  return !!client && !!bucket;
}

export function getRecordingObjectKey(token: string): string {
  const safe = token.replace(/[^a-zA-Z0-9_-]/g, "_");
  const ts = Date.now();
  return `recordings/${safe}/${ts}.webm`;
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
  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/a062950e-dd39-4c19-986f-667c51ac69a7", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "lib/storage.ts:createPresignedUploadUrl",
      message: "createPresignedUploadUrl entry",
      data: { hasClient: !!client, hasBucket: !!bucket, bucket: bucket ?? null, hasEndpoint: !!endpoint, region },
      timestamp: Date.now(),
      hypothesisId: "H1,H5",
    }),
  }).catch(() => {});
  // #endregion
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
    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/a062950e-dd39-4c19-986f-667c51ac69a7", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "lib/storage.ts:createPresignedUploadUrl",
        message: "presigned URL created",
        data: { objectKey, finalUrlPrefix: finalUrl.slice(0, 60) },
        timestamp: Date.now(),
        hypothesisId: "H1,H5",
      }),
    }).catch(() => {});
    // #endregion
    return {
      data: { uploadUrl, objectKey, finalUrl, expiresIn },
      error: null,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Failed to create upload URL.";
    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/a062950e-dd39-4c19-986f-667c51ac69a7", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "lib/storage.ts:createPresignedUploadUrl",
        message: "createPresignedUploadUrl error",
        data: { error: errMsg },
        timestamp: Date.now(),
        hypothesisId: "H1,H5",
      }),
    }).catch(() => {});
    // #endregion
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
