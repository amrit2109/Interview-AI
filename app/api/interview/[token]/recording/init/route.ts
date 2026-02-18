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
  if (!validation.valid || !validation.candidate) {
    return NextResponse.json(
      { error: validation.error ?? "Invalid or expired interview link." },
      { status: 403 }
    );
  }

  const { data, error } = await createPresignedUploadUrl(token.trim());
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
