import { NextResponse } from "next/server";
import {
  getCandidateByInterviewToken,
  completeInterviewWithoutRecording,
} from "@/lib/services/candidate.service";

export async function POST(
  _request: Request,
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

  const result = await completeInterviewWithoutRecording(token.trim());
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to complete interview." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
