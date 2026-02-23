import { describe, it, expect } from "vitest";

function selectTopSkills(
  skills: string[],
  technicalStack: string[],
  experienceYears: number | null,
  jobText: string,
  k: number
): string[] {
  const unique = [...new Set([...skills, ...technicalStack].map((s) => s.toLowerCase().trim()))].filter(Boolean);
  if (unique.length === 0) return [];

  const jdText = jobText.toLowerCase();
  const scored = unique.map((skill) => {
    const jdRelevance = jdText.includes(skill) ? 1 : 0;
    const exp = experienceYears ?? 0;
    const expWeight = exp >= 3 ? 0.3 : exp >= 1 ? 0.2 : 0.1;
    return { skill, score: jdRelevance + expWeight };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.skill);
}

describe("skill selection for question pack", () => {
  it("selects top k skills by job relevance", () => {
    const skills = ["react", "node", "python", "java"];
    const result = selectTopSkills(
      skills,
      [],
      5,
      "Full Stack Engineer with React and Node.js",
      3
    );
    expect(result).toContain("react");
    expect(result).toContain("node");
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("limits to k skills", () => {
    const skills = ["a", "b", "c", "d", "e", "f"];
    const result = selectTopSkills(skills, [], 2, "job", 4);
    expect(result.length).toBe(4);
  });

  it("returns empty for no skills", () => {
    const result = selectTopSkills([], [], null, "job", 5);
    expect(result).toEqual([]);
  });
});
