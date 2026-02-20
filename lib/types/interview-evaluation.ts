/**
 * Evaluation result from answer evaluator.
 * Per-question and overall scores, with no penalty for unanswered.
 */

import { z } from "zod";
import { aiMetadataSchema } from "./ai-metadata";

export const transcriptQualitySchema = z.enum(["missing", "partial", "full"]);
export type TranscriptQuality = z.infer<typeof transcriptQualitySchema>;

export const perQuestionEvaluationSchema = z.object({
  questionId: z.string(),
  skill: z.string(),
  technical_depth: z.number().min(0).max(10),
  correctness: z.number().min(0).max(10),
  communication: z.number().min(0).max(10),
  role_alignment: z.number().min(0).max(10),
  unanswered: z.boolean().default(false),
  transcriptQuality: transcriptQualitySchema.optional(),
  evidenceSpans: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type PerQuestionEvaluation = z.infer<typeof perQuestionEvaluationSchema>;

export const evaluationResultSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  candidateId: z.string(),
  overallScore: z.number().min(0).max(10),
  perQuestion: z.array(perQuestionEvaluationSchema),
  strengths: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  recommendation: z.string().nullable(),
  unansweredCount: z.number().int().min(0).default(0),
  meta: aiMetadataSchema.optional(),
  createdAt: z.string().datetime().optional(),
});

export type EvaluationResult = z.infer<typeof evaluationResultSchema>;
