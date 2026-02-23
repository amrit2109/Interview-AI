/**
 * Frozen interview pack per candidate.
 * Generated during admin resume analysis, locked when invite is sent.
 */

import { z } from "zod";
import { aiMetadataSchema } from "./ai-metadata";

export const interviewPackQuestionSchema = z.object({
  id: z.string(),
  skill: z.string(),
  question: z.string(),
  followUpQuestion: z.string().optional(),
  expectedSignals: z.array(z.string()).optional(),
  order: z.number().int().min(0),
});

export type InterviewPackQuestion = z.infer<typeof interviewPackQuestionSchema>;

export const interviewPackSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  jobRoleId: z.string(),
  jobRoleName: z.string(),
  selectedSkills: z.array(z.string()),
  questions: z.array(interviewPackQuestionSchema),
  rubricWeights: z
    .object({
      technical_depth: z.number().min(0).max(1),
      correctness: z.number().min(0).max(1),
      communication: z.number().min(0).max(1),
      role_alignment: z.number().min(0).max(1),
    })
    .optional(),
  maxFollowUpsPerQuestion: z.number().int().min(0).default(1),
  meta: aiMetadataSchema.optional(),
  createdAt: z.string().datetime().optional(),
});

export type InterviewPack = z.infer<typeof interviewPackSchema>;
