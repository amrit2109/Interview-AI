/**
 * Mock interview data for candidate flow.
 * Token-indexed by link token. Replace with API call later.
 */

export const mockInterviews = {
  demo123: {
    token: "demo123",
    jobTitle: "Frontend Developer",
    company: "Orion Tech",
    department: "Engineering",
    interviewType: "AI Voice Interview",
    estimatedDuration: "15-20 minutes",
    status: "valid",
    instructions: [
      "Find a quiet place with minimal background noise.",
      "Ensure your microphone is working and permissions are granted.",
      "Use a stable internet connection.",
      "Have your resume handy for reference.",
    ],
    expiresAt: "2025-03-15T23:59:59Z",
    questionCount: 5,
  },
  fe789: {
    token: "fe789",
    jobTitle: "Full Stack Engineer",
    company: "Orion Tech",
    department: "Engineering",
    interviewType: "AI Voice Interview",
    estimatedDuration: "20 minutes",
    status: "valid",
    instructions: [
      "Find a quiet place with minimal background noise.",
      "Ensure your microphone is working and permissions are granted.",
      "Use a stable internet connection.",
      "Have your resume handy for reference.",
    ],
    expiresAt: "2025-03-20T23:59:59Z",
    questionCount: 6,
  },
  expired456: {
    token: "expired456",
    jobTitle: "Backend Developer",
    company: "Orion Tech",
    department: "Engineering",
    interviewType: "AI Voice Interview",
    estimatedDuration: "15 minutes",
    status: "expired",
    instructions: [],
    expiresAt: "2024-01-01T00:00:00Z",
    questionCount: 5,
  },
  used789: {
    token: "used789",
    jobTitle: "DevOps Engineer",
    company: "Orion Tech",
    department: "Engineering",
    interviewType: "AI Voice Interview",
    estimatedDuration: "15 minutes",
    status: "alreadyUsed",
    instructions: [],
    expiresAt: "2025-03-15T23:59:59Z",
    questionCount: 5,
  },
};
