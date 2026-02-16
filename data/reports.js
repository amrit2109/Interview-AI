/**
 * Mock report data for admin candidate reports.
 * Replace with API call later.
 */

export const mockReports = {
  "1": {
    candidateId: "1",
    atsScore: 78,
    interviewScore: 85,
    strengths: [
      "Strong React and modern frontend experience",
      "Clear communication during technical questions",
      "Good problem-solving approach",
    ],
    risks: [
      "Limited experience with backend technologies",
    ],
    recommendation: "Proceed to next round",
  },
  "2": {
    candidateId: "2",
    atsScore: 82,
    interviewScore: null,
    strengths: [],
    risks: [],
    recommendation: "Interview in progress",
  },
  "3": {
    candidateId: "3",
    atsScore: 65,
    interviewScore: 72,
    strengths: [
      "Enthusiastic about learning",
      "Team collaboration experience",
    ],
    risks: [
      "ATS score below threshold",
      "Limited years of experience",
    ],
    recommendation: "Reject",
  },
};
