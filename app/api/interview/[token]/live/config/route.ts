import { NextRequest, NextResponse } from "next/server";
import { getCandidateByInterviewToken } from "@/lib/services/candidate.service";
import { getLiveKitConfig } from "@/lib/env";

/**
 * Returns voice config for the client.
 * When LiveKit is configured, voice UI is shown; otherwise typed fallback.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token?.trim()) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  const validation = await getCandidateByInterviewToken(token.trim());
  if (!validation.valid || !validation.candidate) {
    return NextResponse.json(
      { error: validation.error ?? "Invalid or expired link." },
      { status: 403 }
    );
  }

  const lk = getLiveKitConfig();

  return NextResponse.json({
    enabled: !!lk,
  });
}
