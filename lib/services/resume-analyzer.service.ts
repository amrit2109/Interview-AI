/**
 * Resume analyzer service. Wraps resume_ai_parser with metadata and Zod validation.
 * RORO: receive object, return object.
 */

import { parseResumeWithGemini } from "@/lib/services/resume_ai_parser";
import { resumeAnalysisSchema } from "@/lib/types/resume-analysis";
import { createAiMetadata } from "@/lib/types/ai-metadata";

export interface AnalyzeResumeInput {
  resumeText: string;
  jobDescriptions?: Array<{ id: string; jobName: string; description: string }>;
}

export interface AnalyzeResumeOutput {
  data: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    skills: string[];
    experienceYears: number | null;
    experienceSummary: string | null;
    education: string[];
    currentOrLastRole: string | null;
    technicalStack: string[];
    meta: ReturnType<typeof createAiMetadata>;
  } | null;
  error: string | null;
}

export async function analyzeResume(
  input: AnalyzeResumeInput
): Promise<AnalyzeResumeOutput> {
  const { resumeText, jobDescriptions = [] } = input;
  if (!resumeText?.trim()) {
    return { data: null, error: "No resume text to parse." };
  }

  const { candidate, error } = await parseResumeWithGemini(
    resumeText,
    jobDescriptions
  );
  if (error || !candidate) {
    return { data: null, error: error ?? "Failed to parse resume." };
  }

  const meta = createAiMetadata();
  const parsed = resumeAnalysisSchema.safeParse({
    ...candidate,
    meta,
  });
  if (!parsed.success) {
    return {
      data: null,
      error: "Resume analysis did not match expected schema.",
    };
  }

  const d = parsed.data;
  return {
    data: {
      fullName: d.fullName ?? null,
      email: d.email ?? null,
      phone: d.phone ?? null,
      location: d.location ?? null,
      skills: d.skills ?? [],
      experienceYears: d.experienceYears ?? null,
      experienceSummary: d.experienceSummary ?? null,
      education: d.education ?? [],
      currentOrLastRole: d.currentOrLastRole ?? null,
      technicalStack: d.technicalStack ?? [],
      meta,
    },
    error: null,
  };
}
