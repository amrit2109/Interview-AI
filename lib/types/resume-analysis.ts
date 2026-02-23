/**
 * Resume analysis output from AI parser.
 * Used as input for question pack generation.
 */

import { z } from "zod";
import { aiMetadataSchema } from "./ai-metadata";

export const resumeAnalysisSchema = z.object({
  fullName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  skills: z.array(z.string()),
  experienceYears: z.number().nullable(),
  experienceSummary: z.string().nullable(),
  education: z.array(z.string()),
  currentOrLastRole: z.string().nullable(),
  technicalStack: z.array(z.string()),
  meta: aiMetadataSchema.optional(),
});

export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;

export const resumeAnalysisWithMetaSchema = resumeAnalysisSchema.extend({
  meta: aiMetadataSchema,
});
