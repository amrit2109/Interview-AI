/**
 * ATS scoring (0–10) based on keyword relevance, structure, skills alignment, experience clarity.
 */

/**
 * @param {object} candidate
 * @param {string[]} [candidate.skills]
 * @param {string} [candidate.experienceSummary]
 * @param {number|null} [candidate.experienceYears]
 * @param {string[]} [candidate.education]
 * @param {string[]} [candidate.technicalStack]
 * @param {string} [candidate.fullName]
 * @param {string} [candidate.email]
 * @param {Array<{ jobName: string; description: string }>} [jobDescriptions]
 * @returns {{ score: number; explanation: string; breakdown: object }}
 */
export function scoreATS(candidate, jobDescriptions = []) {
  const skills = candidate?.skills ?? [];
  const experienceSummary = candidate?.experienceSummary ?? "";
  const experienceYears = candidate?.experienceYears ?? 0;
  const education = candidate?.education ?? [];
  const technicalStack = candidate?.technicalStack ?? [];
  const hasName = !!(candidate?.fullName?.trim());
  const hasEmail = !!(candidate?.email?.trim());

  const allSkills = [...new Set([...skills, ...technicalStack])];
  const jdText = jobDescriptions
    .map((j) => `${j.jobName} ${j.description}`)
    .join(" ")
    .toLowerCase();

  let keywordRelevance = 5;
  if (jdText && allSkills.length > 0) {
    const matches = allSkills.filter((s) => {
      const norm = s.toLowerCase().replace(/[^a-z0-9]/g, "");
      return jdText.includes(s.toLowerCase()) || jdText.includes(norm);
    });
    const hitRatio = matches.length / Math.max(allSkills.length, 1);
    keywordRelevance = Math.min(10, 3 + hitRatio * 7);
  }

  let structureFormatting = 5;
  if (hasName && hasEmail) structureFormatting += 2;
  if (experienceSummary?.length > 20) structureFormatting += 1.5;
  if (education?.length > 0) structureFormatting += 1;
  if (allSkills.length >= 3) structureFormatting += 0.5;
  structureFormatting = Math.min(10, structureFormatting);

  let skillsAlignment = 5;
  if (jdText && allSkills.length > 0) {
    const tokens = jdText.split(/\s+/);
    const uniqueJd = new Set(tokens.filter((t) => t.length > 2));
    const overlap = allSkills.filter((s) => {
      const norm = s.toLowerCase();
      return [...uniqueJd].some((t) => t.includes(norm) || norm.includes(t));
    }).length;
    skillsAlignment = Math.min(10, 3 + (overlap / Math.max(allSkills.length, 1)) * 5);
  }

  let experienceClarity = 5;
  if (experienceYears > 0) experienceClarity += 2;
  if (experienceSummary?.length > 50) experienceClarity += 2;
  if (experienceSummary?.match(/\d+|years?|yrs?/i)) experienceClarity += 1;
  experienceClarity = Math.min(10, experienceClarity);

  const weights = { keywordRelevance: 0.3, structureFormatting: 0.2, skillsAlignment: 0.3, experienceClarity: 0.2 };
  const score =
    keywordRelevance * weights.keywordRelevance +
    structureFormatting * weights.structureFormatting +
    skillsAlignment * weights.skillsAlignment +
    experienceClarity * weights.experienceClarity;
  const rounded = Math.round(score * 10) / 10;
  const clamped = Math.max(0, Math.min(10, rounded));

  const parts = [];
  if (keywordRelevance >= 7) parts.push("strong keyword relevance");
  else if (keywordRelevance < 5) parts.push("limited keyword match");
  if (structureFormatting >= 7) parts.push("clear structure");
  if (skillsAlignment >= 7) parts.push("good skills alignment");
  else if (skillsAlignment < 5) parts.push("skills gap vs role");
  if (experienceClarity >= 7) parts.push("clear experience");
  else if (experienceClarity < 5) parts.push("experience could be clearer");

  const explanation =
    parts.length > 0
      ? parts.join("; ") + "."
      : "Resume meets baseline ATS criteria.";

  return {
    score: clamped,
    explanation,
    breakdown: {
      keywordRelevance: Math.round(keywordRelevance * 10) / 10,
      structureFormatting: Math.round(structureFormatting * 10) / 10,
      skillsAlignment: Math.round(skillsAlignment * 10) / 10,
      experienceClarity: Math.round(experienceClarity * 10) / 10,
    },
  };
}
