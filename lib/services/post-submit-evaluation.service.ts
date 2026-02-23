/**
 * Post-submit evaluation orchestration.
 * Runs after recording upload: evaluate answers, persist evaluation, update candidate/report.
 */

import { getCandidateByInterviewToken } from "./candidate.service";
import { getSessionByToken, getTurnsBySessionId } from "./interview-session.service";
import { getInterviewPackById } from "./interview-pack.service";
import { getEvaluationBySessionId } from "./interview-evaluation.service";
import { evaluateAnswers } from "./answer-evaluator.service";
import { createEvaluation } from "./interview-evaluation.service";
import { getSql } from "@/lib/db";
import { logAuditEvent } from "@/lib/utils/audit-log";

export async function runPostSubmitEvaluation(
  token: string
): Promise<{ ok: boolean; error?: string }> {
  const validation = await getCandidateByInterviewToken(token.trim());
  if (!validation.valid || !validation.candidate) {
    return { ok: false, error: validation.error ?? "Invalid token." };
  }

  const { data: session } = await getSessionByToken(token.trim());
  if (!session) {
    return { ok: false, error: "No session found." };
  }

  const { data: existingEval } = await getEvaluationBySessionId(session.id);
  if (existingEval) {
    return { ok: true };
  }

  const { data: turns } = await getTurnsBySessionId(session.id);
  if (!turns?.length) {
    return { ok: false, error: "No turns to evaluate." };
  }

  const packId = session.packId;
  let questions: Array<{ id: string; skill: string; question: string }> = [];

  if (packId) {
    const { data: pack } = await getInterviewPackById(packId);
    questions = (pack?.questions ?? []).map((q) => ({
      id: q.id,
      skill: q.skill,
      question: q.question,
    }));
  } else {
    questions = turns.map((t) => ({
      id: t.questionId,
      skill: "general",
      question: t.questionText,
    }));
  }

  const { data: evalData, error: evalError } = await evaluateAnswers({
    sessionId: session.id,
    candidateId: validation.candidate.id,
    questions,
    turns: turns.map((t) => ({
      questionId: t.questionId,
      questionText: t.questionText,
      candidateAnswer: t.candidateAnswer,
      unanswered: t.unanswered,
    })),
    jobRoleName: validation.candidate.position ?? "Interview",
  });

  if (evalError || !evalData) {
    return { ok: false, error: evalError ?? "Evaluation failed." };
  }

  const evalId = `eval-${session.id}-${Date.now()}`;
  const { error: createError } = await createEvaluation({
    id: evalId,
    sessionId: session.id,
    candidateId: validation.candidate.id,
    overallScore: evalData.overallScore,
    perQuestion: evalData.perQuestion,
    strengths: evalData.strengths,
    risks: evalData.risks,
    recommendation: evalData.recommendation,
    unansweredCount: evalData.unansweredCount,
  });

  if (createError) {
    return { ok: false, error: createError };
  }

  const sql = getSql();
  if (sql) {
    try {
      const scoreRounded = Math.round(evalData.overallScore);
      await sql`
        UPDATE candidates
        SET interview_score = ${scoreRounded}
        WHERE id = ${validation.candidate.id}
      `;

      await sql`
        INSERT INTO reports (candidate_id, ats_score, interview_score, strengths, risks, recommendation)
        VALUES (
          ${validation.candidate.id},
          ${validation.candidate.atsScore ?? null},
          ${scoreRounded},
          ${JSON.stringify(evalData.strengths)},
          ${JSON.stringify(evalData.risks)},
          ${evalData.recommendation ?? "See evaluation"}
        )
        ON CONFLICT (candidate_id) DO UPDATE SET
          interview_score = ${scoreRounded},
          strengths = ${JSON.stringify(evalData.strengths)},
          risks = ${JSON.stringify(evalData.risks)},
          recommendation = ${evalData.recommendation ?? "See evaluation"}
      `;
    } catch (err) {
      console.error("post-submit-evaluation: update candidate/report failed:", err);
    }
  }

  logAuditEvent({
    event: "evaluation_completed",
    token,
    candidateId: validation.candidate.id,
    sessionId: session.id,
    evaluationId: evalId,
  });
  return { ok: true };
}
