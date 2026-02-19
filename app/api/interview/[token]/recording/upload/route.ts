import { NextRequest, NextResponse } from "next/server";
import {
  getCandidateByInterviewToken,
  completeInterviewRecording,
  isRecordingAlreadyCompleted,
} from "@/lib/services/candidate.service";
import { createPresignedUploadUrl } from "@/lib/storage";
import { submitSession } from "@/lib/services/interview-session.service";
import { runPostSubmitEvaluation } from "@/lib/services/post-submit-evaluation.service";
import { logAuditEvent } from "@/lib/utils/audit-log";

const MAX_BODY_BYTES = 512 * 1024 * 1024; // 512 MB

/**
 * Upload recording via presigned URL using Node's fetch (undici).
 * Avoids S3 client's Node HTTPS agent which can trigger SSL handshake
 * failure with Cloudflare R2 on Windows/Node OpenSSL builds.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token?.trim()) {
    return NextResponse.json(
      { error: "Invalid or missing token." },
      { status: 400 }
    );
  }

  const validation = await getCandidateByInterviewToken(token.trim());
  if (!validation.valid || !validation.candidate) {
    return NextResponse.json(
      { error: validation.error ?? "Invalid or expired interview link." },
      { status: 403 }
    );
  }

  if (await isRecordingAlreadyCompleted(token.trim())) {
    return NextResponse.json({ ok: true });
  }

  const contentType = request.headers.get("content-type") ?? "video/webm";
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const len = parseInt(contentLength, 10);
    if (!Number.isFinite(len) || len > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Recording too large." },
        { status: 413 }
      );
    }
  }

  let body: ArrayBuffer;
  try {
    body = await request.arrayBuffer();
  } catch {
    return NextResponse.json(
      { error: "Failed to read request body." },
      { status: 400 }
    );
  }
  if (body.byteLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Recording too large." },
      { status: 413 }
    );
  }

  const presigned = await createPresignedUploadUrl(token.trim(), contentType);
  if (presigned.error || !presigned.data) {
    return NextResponse.json(
      { error: presigned.error ?? "Failed to get upload URL." },
      { status: 503 }
    );
  }

  const { uploadUrl, finalUrl } = presigned.data;
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body,
    headers: { "Content-Type": contentType },
  });

  if (!putRes.ok) {
    const errText = await putRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Upload to storage failed: ${putRes.status} ${errText.slice(0, 200)}` },
      { status: 503 }
    );
  }

  const result = await completeInterviewRecording({
    token: token.trim(),
    interviewLink: finalUrl,
  });

  if (!result.ok) {
    const errMsg = result.error ?? "Failed to save recording.";
    if (errMsg.includes("does not exist") || errMsg.includes("column")) {
      return NextResponse.json(
        { error: "Database schema is missing recording columns. Run the migration: db/migrations/002_add_interview_recording_columns.sql" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }

  await submitSession(token.trim(), finalUrl);
  logAuditEvent({ event: "session_submitted", token: token.trim() });

  runPostSubmitEvaluation(token.trim()).catch((err) => {
    console.error("post-submit evaluation failed:", err);
  });

  return NextResponse.json({ ok: true });
}
