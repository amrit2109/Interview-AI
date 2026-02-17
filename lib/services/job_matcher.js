/**
 * Weighted job-profile matching. Returns best role, percentage, and reasoning.
 */

import { getActiveJobDescriptions, getJobDescriptions } from "@/lib/mock-api";

/**
 * @param {object} candidate
 * @param {string[]} [candidate.skills]
 * @param {number|null} [candidate.experienceYears]
 * @param {string[]} [candidate.education]
 * @param {string} [candidate.currentOrLastRole]
 * @param {string[]} [candidate.technicalStack]
 * @param {Array<{ id: string; jobName: string; description: string; openings?: number }>} [jobDescriptions]
 * @returns {Promise<{ roleId: string; roleName: string; percentage: number; reasoning: string; factorScores: object } | null>}
 */
export async function matchBestJob(candidate, jobDescriptions = null) {
  let jds = jobDescriptions;
  if (!jds || jds.length === 0) {
    const { data } = await getActiveJobDescriptions();
    jds = data ?? [];
  }
  if (!jds || jds.length === 0) {
    const { data } = await getJobDescriptions();
    jds = data ?? [];
  }
  const active = (jds || []).filter((j) => (j.openings ?? 1) > 0);
  if (active.length === 0) {
    const fallback = jds?.[0];
    if (!fallback) return null;
    return {
      roleId: fallback.id,
      roleName: fallback.jobName,
      percentage: 0,
      reasoning: "No active openings; showing first available role.",
      factorScores: { skills: 0, roleTitle: 0, experience: 0, education: 0 },
    };
  }

  const skills = new Set((candidate?.skills ?? []).map((s) => String(s).toLowerCase()));
  const techStack = new Set((candidate?.technicalStack ?? []).map((t) => String(t).toLowerCase()));
  const allSkills = new Set([...skills, ...techStack]);
  const expYears = candidate?.experienceYears ?? 0;
  const education = (candidate?.education ?? []).map((e) => String(e).toLowerCase());
  const candidateRole = (candidate?.currentOrLastRole ?? "").toLowerCase();

  const scored = active.map((jd) => {
    const jdText = `${jd.jobName} ${jd.description}`.toLowerCase();
    const jdTokens = jdText.split(/\s+/).filter((t) => t.length > 2);
    const jdSkillSet = new Set(jdTokens);

    const skillOverlap =
      allSkills.size === 0
        ? 0.5
        : [...allSkills].filter((s) => [...jdSkillSet].some((t) => t.includes(s) || s.includes(t))).length /
          allSkills.size;
    const skillsScore = Math.min(1, skillOverlap * 1.2);

    const roleTokens = (jd.jobName ?? "").toLowerCase().split(/\s+/);
    const roleOverlap =
      roleTokens.length === 0
        ? 0.5
        : roleTokens.filter((t) => candidateRole.includes(t)).length / Math.max(roleTokens.length, 1);
    const roleTitleScore = Math.min(1, roleOverlap + (candidateRole ? 0.2 : 0));

    const expMatch = expYears >= 3 ? 0.9 : expYears >= 1 ? 0.7 : 0.5;
    const experienceScore = expMatch;

    const hasDegree = education.some(
      (e) => e.includes("bachelor") || e.includes("b.s") || e.includes("btech") || e.includes("degree")
    );
    const educationScore = hasDegree ? 0.9 : education.length > 0 ? 0.6 : 0.4;

    const weights = { skills: 0.45, roleTitle: 0.25, experience: 0.2, education: 0.1 };
    const total =
      skillsScore * weights.skills +
      roleTitleScore * weights.roleTitle +
      experienceScore * weights.experience +
      educationScore * weights.education;
    const percentage = Math.round(total * 100);

    return {
      jd,
      total,
      percentage,
      factorScores: { skills: skillsScore, roleTitle: roleTitleScore, experience: experienceScore, education: educationScore },
    };
  });

  scored.sort((a, b) => b.total - a.total);
  const best = scored[0];
  if (!best) return null;

  const reasons = [];
  if (best.factorScores.skills > 0.6) reasons.push("strong skills overlap");
  if (best.factorScores.roleTitle > 0.5) reasons.push("role title alignment");
  if (best.factorScores.experience > 0.6) reasons.push("experience fit");
  if (best.factorScores.education > 0.6) reasons.push("education match");
  const reasoning =
    reasons.length > 0
      ? `Highest overlap in ${reasons.join(" and ")} with sufficient experience depth.`
      : "Best available match among active openings.";

  return {
    roleId: best.jd.id,
    roleName: best.jd.jobName,
    percentage: Math.min(100, best.percentage),
    reasoning,
    factorScores: best.factorScores,
  };
}
