import { NextRequest, NextResponse } from "next/server";
import { overrideEvaluationScore } from "@/lib/services/interview-evaluation.service";
import { getEvaluationByCandidateId } from "@/lib/services/interview-evaluation.service";
import { getSql } from "@/lib/db";

function parseBody(body: unknown): { score: number; reason: string } | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const score = typeof o.score === "number" ? o.score : Number(o.score);
  const reason = typeof o.reason === "string" ? o.reason : "";
  if (!Number.isFinite(score) || score < 0 || score > 10) return null;
  return { score, reason };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: candidateId } = await params;
  if (!candidateId?.trim()) {
    return NextResponse.json({ error: "Candidate ID required." }, { status: 400 });
  }

  let body: ReturnType<typeof parseBody> = null;
  try {
    body = parseBody(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json(
      { error: "score (0-10) and reason are required." },
      { status: 400 }
    );
  }

  const { data: evaluation } = await getEvaluationByCandidateId(candidateId.trim());
  if (!evaluation) {
    return NextResponse.json(
      { error: "No evaluation found for this candidate." },
      { status: 404 }
    );
  }

  const { ok, error } = await overrideEvaluationScore(
    evaluation.id,
    body.score,
    body.reason
  );
  if (!ok) {
    return NextResponse.json(
      { error: error ?? "Failed to override score." },
      { status: 500 }
    );
  }

  const sql = getSql();
  if (sql) {
    const scoreRounded = Math.round(body.score);
    await sql`
      UPDATE candidates SET interview_score = ${scoreRounded} WHERE id = ${candidateId.trim()}
    `;
    await sql`
      UPDATE reports SET interview_score = ${scoreRounded} WHERE candidate_id = ${candidateId.trim()}
    `;
  }

  return NextResponse.json({ ok: true, overrideScore: body.score });
}
