import { NextRequest, NextResponse } from "next/server";
import { getCandidateByInterviewToken } from "@/lib/services/candidate.service";
import { createPresignedUploadUrl } from "@/lib/storage";

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
  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/a062950e-dd39-4c19-986f-667c51ac69a7", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "app/api/interview/[token]/recording/init/route.ts",
      message: "init after validation",
      data: { valid: validation.valid, error: validation.error ?? null },
      timestamp: Date.now(),
      hypothesisId: "H1",
    }),
  }).catch(() => {});
  // #endregion
  if (!validation.valid || !validation.candidate) {
    return NextResponse.json(
      { error: validation.error ?? "Invalid or expired interview link." },
      { status: 403 }
    );
  }

  const { data, error } = await createPresignedUploadUrl(token.trim());
  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/a062950e-dd39-4c19-986f-667c51ac69a7", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "app/api/interview/[token]/recording/init/route.ts",
      message: "init createPresignedUploadUrl result",
      data: { hasData: !!data, error: error ?? null },
      timestamp: Date.now(),
      hypothesisId: "H1",
    }),
  }).catch(() => {});
  // #endregion
  if (error || !data) {
    return NextResponse.json(
      { error: error ?? "Failed to create upload URL." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    uploadUrl: data.uploadUrl,
    objectKey: data.objectKey,
    finalUrl: data.finalUrl,
    expiresIn: data.expiresIn,
  });
}
