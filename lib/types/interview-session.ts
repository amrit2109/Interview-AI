/**
 * Interview session and turn state.
 * Persisted during candidate runtime.
 */

import { z } from "zod";

export const interviewTurnSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  questionText: z.string(),
  isFollowUp: z.boolean().default(false),
  candidateAnswer: z.string().nullable(),
  transcriptChunk: z.string().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  unanswered: z.boolean().default(false),
});

export type InterviewTurn = z.infer<typeof interviewTurnSchema>;

export const interviewSessionSchema = z.object({
  id: z.string(),
  token: z.string(),
  packId: z.string(),
  currentQuestionIndex: z.number().int().min(0),
  turns: z.array(interviewTurnSchema),
  startedAt: z.string().datetime(),
  submittedAt: z.string().datetime().optional(),
  recordingUrl: z.string().nullable().optional(),
});

export type InterviewSession = z.infer<typeof interviewSessionSchema>;
