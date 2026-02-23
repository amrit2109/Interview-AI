/**
 * Shared types used by services and API consumers.
 */

export type { ReadResult, WriteResult } from "./service-result";
export type { CandidateAdmin as Candidate } from "@/lib/services/candidates-admin.service";
export type { JobDescription } from "@/lib/services/jobs.service";
export type { Report } from "@/lib/services/candidates-admin.service";

export type { AiMetadata } from "./ai-metadata";
export { aiMetadataSchema, createAiMetadata } from "./ai-metadata";

export type { ResumeAnalysis } from "./resume-analysis";
export { resumeAnalysisSchema } from "./resume-analysis";

export type { InterviewPack, InterviewPackQuestion } from "./interview-pack";
export { interviewPackSchema, interviewPackQuestionSchema } from "./interview-pack";

export type { InterviewSession, InterviewTurn } from "./interview-session";
export { interviewSessionSchema, interviewTurnSchema } from "./interview-session";

export type {
  EvaluationResult,
  PerQuestionEvaluation,
} from "./interview-evaluation";
export {
  evaluationResultSchema,
  perQuestionEvaluationSchema,
} from "./interview-evaluation";
