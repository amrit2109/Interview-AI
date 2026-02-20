import { NextRequest, NextResponse } from "next/server";
import { getCandidateByInterviewToken } from "@/lib/services/candidate.service";
import {
  getSessionByToken,
  recordTurn,
  advanceSession,
} from "@/lib/services/interview-session.service";
import { getInterviewPackById } from "@/lib/services/interview-pack.service";

function parseBody(body: unknown): {
  questionId: string;
  questionText: string;
  answer: string | null;
  transcriptChunks?: string[];
  unanswered: boolean;
  totalQuestions: number;
} | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const questionId = typeof o.questionId === "string" ? o.questionId : "";
  const questionText = typeof o.questionText === "string" ? o.questionText : "";
  if (!questionId || !questionText) return null;
  let answer: string | null = typeof o.answer === "string" ? o.answer : null;
  const chunks = Array.isArray(o.transcriptChunks)
    ? (o.transcriptChunks as unknown[]).filter((c): c is string => typeof c === "string")
    : [];
  if (!answer?.trim() && chunks.length > 0) {
    answer = chunks.join(" ").trim() || null;
  }
  const unanswered = o.unanswered === true || !(answer?.trim());
  const totalQuestions = typeof o.totalQuestions === "number" ? o.totalQuestions : 0;
  return { questionId, questionText, answer, transcriptChunks: chunks, unanswered, totalQuestions };
}

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

  let body: ReturnType<typeof parseBody> = null;
  try {
    body = parseBody(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json(
      { error: "questionId and questionText are required." },
      { status: 400 }
    );
  }

  const { data: session } = await getSessionByToken(token.trim());
  if (!session) {
    return NextResponse.json(
      { error: "Session not started. Start session first." },
      { status: 400 }
    );
  }

  const turnId = `turn-${session.id}-${Date.now()}`;
  const now = new Date().toISOString();
  const { ok: turnOk, error: turnError } = await recordTurn({
    id: turnId,
    sessionId: session.id,
    questionId: body.questionId,
    questionText: body.questionText,
    isFollowUp: false,
    candidateAnswer: body.answer,
    transcriptChunk: body.answer,
    startedAt: now,
    endedAt: now,
    unanswered: body.unanswered,
  });
  if (!turnOk || turnError) {
    return NextResponse.json(
      { error: turnError ?? "Failed to record turn." },
      { status: 500 }
    );
  }

  const { ok: advanceOk, error: advanceError } = await advanceSession(token.trim());
  if (!advanceOk || advanceError) {
    return NextResponse.json(
      { error: advanceError ?? "Failed to advance session." },
      { status: 500 }
    );
  }

  const { data: updatedSession } = await getSessionByToken(token.trim());
  const nextIndex = updatedSession?.currentQuestionIndex ?? session.currentQuestionIndex + 1;

  let questionCount = body.totalQuestions;
  if (session.packId && questionCount <= 0) {
    const { data: pack } = await getInterviewPackById(session.packId);
    questionCount = pack?.questions?.length ?? 0;
  }

  const isComplete = nextIndex >= questionCount;

  return NextResponse.json({
    nextIndex,
    isComplete,
    questionCount,
  });
}
