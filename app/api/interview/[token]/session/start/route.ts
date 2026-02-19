import { NextRequest, NextResponse } from "next/server";
import { getCandidateByInterviewToken } from "@/lib/services/candidate.service";
import { logAuditEvent } from "@/lib/utils/audit-log";
import {
  getSessionByToken,
  createSession,
} from "@/lib/services/interview-session.service";
import { getInterviewPackByToken } from "@/lib/services/interview-pack.service";

export async function POST(
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

  const { data: existing } = await getSessionByToken(token.trim());
  if (existing) {
    logAuditEvent({
      event: "session_started",
      token: token.trim(),
      sessionId: existing.id,
    });
    return NextResponse.json({
      sessionId: existing.id,
      packId: existing.packId,
      currentIndex: existing.currentQuestionIndex,
    });
  }

  const { data: pack } = await getInterviewPackByToken(token.trim());
  const packId = pack?.id ?? null;

  const sessionId = `sess-${token}-${Date.now()}`;
  const { data: session, error } = await createSession({
    id: sessionId,
    token: token.trim(),
    packId,
  });

  if (error || !session) {
    return NextResponse.json(
      { error: error ?? "Failed to start session." },
      { status: 500 }
    );
  }

  logAuditEvent({
    event: "session_started",
    token: token.trim(),
    sessionId: session.id,
    packId: session.packId ?? undefined,
  });
  return NextResponse.json({
    sessionId: session.id,
    packId: session.packId,
    currentIndex: session.currentQuestionIndex,
  });
}
