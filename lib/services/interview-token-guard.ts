import { getCandidateByInterviewToken } from "./candidate.service";

const DEFAULT_INSTRUCTIONS = [
  "Find a quiet place with minimal background noise.",
  "Ensure your microphone is working and permissions are granted.",
  "Use a stable internet connection.",
  "Have your resume handy for reference.",
];

export interface CandidateDisplay {
  name: string;
  email: string;
  position: string;
  experienceYears: number | null;
}

export interface InterviewDisplay {
  jobTitle: string;
  company: string;
  department: string;
  interviewType: string;
  estimatedDuration: string;
  status: string;
  instructions: string[];
  expiresAt: string;
  questionCount: number;
  candidate: CandidateDisplay | null;
}

export interface InterviewTokenGuardResult {
  data: InterviewDisplay | null;
  error: string | null;
  expired?: boolean;
}

/**
 * Validate interview token via candidate and return display data for UI.
 * Replaces getInterviewByToken for candidate-sourced tokens.
 */
export async function getInterviewDisplayByToken(
  token: string
): Promise<InterviewTokenGuardResult> {
  const result = await getCandidateByInterviewToken(token);

  if (!result.valid || !result.candidate) {
    return {
      data: null,
      error: result.error ?? "Invalid or expired interview link.",
      expired: result.expired ?? false,
    };
  }

  const c = result.candidate;
  const candidateInfo: CandidateDisplay = {
    name: c.name,
    email: c.email,
    position: c.position ?? "Unassigned",
    experienceYears: c.experienceYears ?? null,
  };
  const display: InterviewDisplay = {
    jobTitle: c.position ?? "Interview",
    company: "Orion Tech",
    department: "Engineering",
    interviewType: "AI Voice Interview",
    estimatedDuration: "15-20 minutes",
    status: "valid",
    instructions: DEFAULT_INSTRUCTIONS,
    expiresAt: c.tokenExpiresAt instanceof Date ? c.tokenExpiresAt.toISOString() : String(c.tokenExpiresAt),
    questionCount: 5,
    candidate: candidateInfo,
  };

  return { data: display, error: null };
}
