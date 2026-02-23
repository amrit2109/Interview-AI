import { describe, it, expect } from "vitest";
import {
  evaluationResultSchema,
  perQuestionEvaluationSchema,
} from "@/lib/types/interview-evaluation";

describe("evaluation schemas", () => {
  it("validates per-question evaluation with unanswered", () => {
    const result = perQuestionEvaluationSchema.safeParse({
      questionId: "q1",
      skill: "react",
      technical_depth: 0,
      correctness: 0,
      communication: 0,
      role_alignment: 0,
      unanswered: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates per-question evaluation with scores", () => {
    const result = perQuestionEvaluationSchema.safeParse({
      questionId: "q1",
      skill: "react",
      technical_depth: 8,
      correctness: 7,
      communication: 9,
      role_alignment: 8,
      unanswered: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects scores out of range", () => {
    const result = perQuestionEvaluationSchema.safeParse({
      questionId: "q1",
      skill: "react",
      technical_depth: 11,
      correctness: 7,
      communication: 9,
      role_alignment: 8,
      unanswered: false,
    });
    expect(result.success).toBe(false);
  });

  it("validates full evaluation result", () => {
    const result = evaluationResultSchema.safeParse({
      id: "eval-1",
      sessionId: "sess-1",
      candidateId: "c1",
      overallScore: 7.5,
      perQuestion: [
        {
          questionId: "q1",
          skill: "react",
          technical_depth: 8,
          correctness: 7,
          communication: 9,
          role_alignment: 8,
          unanswered: false,
        },
        {
          questionId: "q2",
          skill: "node",
          technical_depth: 0,
          correctness: 0,
          communication: 0,
          role_alignment: 0,
          unanswered: true,
        },
      ],
      strengths: ["Strong React experience"],
      risks: [],
      recommendation: "Proceed",
      unansweredCount: 1,
    });
    expect(result.success).toBe(true);
  });
});

describe("no-penalty for unanswered", () => {
  it("unanswered questions have zero scores without penalty", () => {
    const pq = perQuestionEvaluationSchema.parse({
      questionId: "q1",
      skill: "react",
      technical_depth: 0,
      correctness: 0,
      communication: 0,
      role_alignment: 0,
      unanswered: true,
    });
    expect(pq.unanswered).toBe(true);
    expect(pq.technical_depth).toBe(0);
    expect(pq.correctness).toBe(0);
  });
});
