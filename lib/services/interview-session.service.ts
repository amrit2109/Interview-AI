/**
 * Interview session DB service. CRUD for sessions and turns.
 * Live interviewer logic: get next question from pack.
 */

import { getSql } from "@/lib/db";
import { getInterviewPackById } from "./interview-pack.service";

export interface InterviewSessionRow {
  id: string;
  token: string;
  packId: string | null;
  currentQuestionIndex: number;
  startedAt: string;
  submittedAt: string | null;
  recordingUrl: string | null;
}

export interface InterviewTurnRow {
  id: string;
  sessionId: string;
  questionId: string;
  questionText: string;
  isFollowUp: boolean;
  candidateAnswer: string | null;
  transcriptChunk: string | null;
  startedAt: string;
  endedAt: string | null;
  unanswered: boolean;
}

export interface CreateSessionInput {
  id: string;
  token: string;
  packId: string | null;
}

export async function createSession(
  input: CreateSessionInput
): Promise<{ data: InterviewSessionRow | null; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: null, error: "Database not configured." };

  try {
    const rows = await sql`
      INSERT INTO interview_sessions (id, token, pack_id, current_question_index)
      VALUES (${input.id}, ${input.token}, ${input.packId}, 0)
      RETURNING id, token, pack_id, current_question_index, started_at, submitted_at, recording_url
    `;
    const r = rows[0] as Record<string, unknown> | undefined;
    if (!r) return { data: null, error: "Failed to create session." };
    return {
      data: {
        id: String(r.id),
        token: String(r.token),
        packId: r.pack_id != null ? String(r.pack_id) : null,
        currentQuestionIndex: Number(r.current_question_index),
        startedAt: r.started_at instanceof Date ? r.started_at.toISOString() : String(r.started_at),
        submittedAt: r.submitted_at != null ? (r.submitted_at instanceof Date ? r.submitted_at.toISOString() : String(r.submitted_at)) : null,
        recordingUrl: r.recording_url != null ? String(r.recording_url) : null,
      },
      error: null,
    };
  } catch (err) {
    console.error("createSession:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to create session.",
    };
  }
}

export async function getSessionByToken(
  token: string
): Promise<{ data: InterviewSessionRow | null; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: null, error: "Database not configured." };

  try {
    const rows = await sql`
      SELECT id, token, pack_id, current_question_index, started_at, submitted_at, recording_url
      FROM interview_sessions WHERE token = ${token} ORDER BY started_at DESC LIMIT 1
    `;
    const r = rows[0] as Record<string, unknown> | undefined;
    if (!r) return { data: null, error: null };
    return {
      data: {
        id: String(r.id),
        token: String(r.token),
        packId: r.pack_id != null ? String(r.pack_id) : null,
        currentQuestionIndex: Number(r.current_question_index),
        startedAt: r.started_at instanceof Date ? r.started_at.toISOString() : String(r.started_at),
        submittedAt: r.submitted_at != null ? (r.submitted_at instanceof Date ? r.submitted_at.toISOString() : String(r.submitted_at)) : null,
        recordingUrl: r.recording_url != null ? String(r.recording_url) : null,
      },
      error: null,
    };
  } catch (err) {
    console.error("getSessionByToken:", err);
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch session." };
  }
}

export async function getSessionById(
  id: string
): Promise<{ data: InterviewSessionRow | null; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: null, error: "Database not configured." };

  try {
    const rows = await sql`
      SELECT id, token, pack_id, current_question_index, started_at, submitted_at, recording_url
      FROM interview_sessions WHERE id = ${id} LIMIT 1
    `;
    const r = rows[0] as Record<string, unknown> | undefined;
    if (!r) return { data: null, error: null };
    return {
      data: {
        id: String(r.id),
        token: String(r.token),
        packId: r.pack_id != null ? String(r.pack_id) : null,
        currentQuestionIndex: Number(r.current_question_index),
        startedAt: r.started_at instanceof Date ? r.started_at.toISOString() : String(r.started_at),
        submittedAt: r.submitted_at != null ? (r.submitted_at instanceof Date ? r.submitted_at.toISOString() : String(r.submitted_at)) : null,
        recordingUrl: r.recording_url != null ? String(r.recording_url) : null,
      },
      error: null,
    };
  } catch (err) {
    console.error("getSessionById:", err);
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch session." };
  }
}

export interface GetNextQuestionResult {
  question: {
    id: string;
    skill: string;
    question: string;
    followUpQuestion?: string;
    order: number;
  } | null;
  isFollowUp: boolean;
  isComplete: boolean;
  totalQuestions: number;
  currentIndex: number;
}

export async function getNextQuestion(
  token: string,
  packId: string | null
): Promise<{ data: GetNextQuestionResult; error: string | null }> {
  if (!packId) {
    return {
      data: {
        question: null,
        isFollowUp: false,
        isComplete: true,
        totalQuestions: 0,
        currentIndex: 0,
      },
      error: null,
    };
  }

  const { data: session } = await getSessionByToken(token);
  const { data: pack } = await getInterviewPackById(packId);
  if (!session || !pack) {
    return {
      data: {
        question: null,
        isFollowUp: false,
        isComplete: true,
        totalQuestions: pack?.questions?.length ?? 0,
        currentIndex: session?.currentQuestionIndex ?? 0,
      },
      error: null,
    };
  }

  const idx = session.currentQuestionIndex;
  const questions = pack.questions ?? [];
  if (idx >= questions.length) {
    return {
      data: {
        question: null,
        isFollowUp: false,
        isComplete: true,
        totalQuestions: questions.length,
        currentIndex: idx,
      },
      error: null,
    };
  }

  const q = questions[idx];
  return {
    data: {
      question: {
        id: q.id,
        skill: q.skill,
        question: q.question,
        followUpQuestion: q.followUpQuestion,
        order: q.order,
      },
      isFollowUp: false,
      isComplete: false,
      totalQuestions: questions.length,
      currentIndex: idx,
    },
    error: null,
  };
}

export async function advanceSession(
  token: string
): Promise<{ ok: boolean; error: string | null }> {
  const sql = getSql();
  if (!sql) return { ok: false, error: "Database not configured." };

  try {
    await sql`
      UPDATE interview_sessions
      SET current_question_index = current_question_index + 1
      WHERE token = ${token}
    `;
    return { ok: true, error: null };
  } catch (err) {
    console.error("advanceSession:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to advance session." };
  }
}

export interface RecordTurnInput {
  id: string;
  sessionId: string;
  questionId: string;
  questionText: string;
  isFollowUp: boolean;
  candidateAnswer: string | null;
  transcriptChunk?: string | null;
  startedAt: string;
  endedAt?: string | null;
  unanswered: boolean;
}

export async function getTurnBySessionAndQuestion(
  sessionId: string,
  questionId: string
): Promise<{ data: InterviewTurnRow | null; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: null, error: "Database not configured." };

  try {
    const rows = await sql`
      SELECT id, session_id, question_id, question_text, is_follow_up, candidate_answer, transcript_chunk, started_at, ended_at, unanswered
      FROM interview_turns WHERE session_id = ${sessionId} AND question_id = ${questionId} LIMIT 1
    `;
    const r = rows[0] as Record<string, unknown> | undefined;
    if (!r) return { data: null, error: null };
    return {
      data: {
        id: String(r.id),
        sessionId: String(r.session_id),
        questionId: String(r.question_id),
        questionText: String(r.question_text),
        isFollowUp: Boolean(r.is_follow_up),
        candidateAnswer: r.candidate_answer != null ? String(r.candidate_answer) : null,
        transcriptChunk: r.transcript_chunk != null ? String(r.transcript_chunk) : null,
        startedAt: r.started_at instanceof Date ? r.started_at.toISOString() : String(r.started_at),
        endedAt: r.ended_at != null ? (r.ended_at instanceof Date ? r.ended_at.toISOString() : String(r.ended_at)) : null,
        unanswered: Boolean(r.unanswered),
      },
      error: null,
    };
  } catch (err) {
    console.error("getTurnBySessionAndQuestion:", err);
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch turn." };
  }
}

export async function recordTurn(
  input: RecordTurnInput
): Promise<{ ok: boolean; error: string | null }> {
  const sql = getSql();
  if (!sql) return { ok: false, error: "Database not configured." };

  try {
    await sql`
      INSERT INTO interview_turns (id, session_id, question_id, question_text, is_follow_up, candidate_answer, transcript_chunk, started_at, ended_at, unanswered)
      VALUES (
        ${input.id},
        ${input.sessionId},
        ${input.questionId},
        ${input.questionText},
        ${input.isFollowUp},
        ${input.candidateAnswer},
        ${input.transcriptChunk ?? null},
        ${input.startedAt}::timestamptz,
        ${input.endedAt ?? null}::timestamptz,
        ${input.unanswered}
      )
    `;
    return { ok: true, error: null };
  } catch (err) {
    console.error("recordTurn:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to record turn." };
  }
}

export async function submitSession(
  token: string,
  recordingUrl: string | null
): Promise<{ ok: boolean; error: string | null }> {
  const sql = getSql();
  if (!sql) return { ok: false, error: "Database not configured." };

  try {
    await sql`
      UPDATE interview_sessions
      SET submitted_at = NOW(), recording_url = ${recordingUrl}
      WHERE token = ${token}
    `;
    return { ok: true, error: null };
  } catch (err) {
    console.error("submitSession:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to submit session." };
  }
}

export async function getTurnsBySessionId(
  sessionId: string
): Promise<{ data: InterviewTurnRow[]; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: [], error: "Database not configured." };

  try {
    const rows = await sql`
      SELECT id, session_id, question_id, question_text, is_follow_up, candidate_answer, transcript_chunk, started_at, ended_at, unanswered
      FROM interview_turns WHERE session_id = ${sessionId} ORDER BY started_at
    `;
    const data = (rows as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      sessionId: String(r.session_id),
      questionId: String(r.question_id),
      questionText: String(r.question_text),
      isFollowUp: Boolean(r.is_follow_up),
      candidateAnswer: r.candidate_answer != null ? String(r.candidate_answer) : null,
      transcriptChunk: r.transcript_chunk != null ? String(r.transcript_chunk) : null,
      startedAt: r.started_at instanceof Date ? r.started_at.toISOString() : String(r.started_at),
      endedAt: r.ended_at != null ? (r.ended_at instanceof Date ? r.ended_at.toISOString() : String(r.ended_at)) : null,
      unanswered: Boolean(r.unanswered),
    }));
    return { data, error: null };
  } catch (err) {
    console.error("getTurnsBySessionId:", err);
    return { data: [], error: err instanceof Error ? err.message : "Failed to fetch turns." };
  }
}
