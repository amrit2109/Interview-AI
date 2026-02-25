/**
 * Seed script: populates Neon PostgreSQL with initial data from mock files.
 * Run after schema: npm run db:seed
 *
 * Requires in .env or .env.local:
 *   - DATABASE_URL
 *   - SEED_ADMIN_PASSWORD (no default; must be set)
 */

import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });
dotenv.config(); // fallback to .env

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required. Add it to .env or .env.local.");
  process.exit(1);
}

const adminPassword = process.env.SEED_ADMIN_PASSWORD;
if (!adminPassword || adminPassword.trim() === "") {
  console.error("SEED_ADMIN_PASSWORD is required. Add it to .env or .env.local.");
  process.exit(1);
}

const sql = neon(connectionString);

async function seed() {
  console.log("Seeding database...");

  // 1. Admins (hash password)
  const passwordHash = bcrypt.hashSync(adminPassword, 10);
  await sql`
    INSERT INTO admins (id, email, password_hash, name, role)
    VALUES ('1', 'admin@orion.com', ${passwordHash}, 'Admin User', 'admin')
    ON CONFLICT (id) DO NOTHING
  `;
  console.log("  - admins");

  // 2. Job descriptions
  const jds = [
    ["1", "Frontend Developer", "Build responsive web applications using React and modern JavaScript. Collaborate with design and backend teams.", 3],
    ["2", "Full Stack Engineer", "Develop end-to-end features from database to UI. Experience with Node.js, React, and cloud services.", 2],
    ["3", "DevOps Engineer", "Manage CI/CD pipelines, infrastructure as code, and cloud deployments. Strong Kubernetes and AWS experience.", 1],
    ["4", "Product Manager", "Define product roadmap, work with stakeholders, and guide development teams. Strong analytical skills.", 2],
  ];
  for (const [id, jobName, description, openings] of jds) {
    await sql`
      INSERT INTO job_descriptions (id, job_name, description, openings)
      VALUES (${id}, ${jobName}, ${description}, ${openings})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log("  - job_descriptions");

  // 3. Questions (skip if already populated)
  const existingQuestions = await sql`SELECT 1 FROM questions LIMIT 1`;
  if (existingQuestions.length === 0) {
    const questions = [
      "Tell us about your experience with React and modern frontend frameworks.",
      "Describe a challenging project you worked on and how you overcame obstacles.",
      "How do you approach debugging and troubleshooting production issues?",
      "What strategies do you use to stay updated with new technologies?",
      "Tell us about a time you collaborated with a team on a tight deadline.",
    ];
    for (const text of questions) {
      await sql`INSERT INTO questions (text) VALUES (${text})`;
    }
  }
  console.log("  - questions");

  // 4. Interviews
  const interviews = [
    ["demo123", "Frontend Developer", "Orion Tech", "Engineering", "AI Voice Interview", "15-20 minutes", "valid", JSON.stringify(["Find a quiet place with minimal background noise.", "Ensure your microphone is working and permissions are granted.", "Use a stable internet connection.", "Have your resume handy for reference."]), "2025-03-15T23:59:59Z", 5],
    ["fe789", "Full Stack Engineer", "Orion Tech", "Engineering", "AI Voice Interview", "20 minutes", "valid", JSON.stringify(["Find a quiet place with minimal background noise.", "Ensure your microphone is working and permissions are granted.", "Use a stable internet connection.", "Have your resume handy for reference."]), "2025-03-20T23:59:59Z", 6],
    ["expired456", "Backend Developer", "Orion Tech", "Engineering", "AI Voice Interview", "15 minutes", "expired", "[]", "2024-01-01T00:00:00Z", 5],
    ["used789", "DevOps Engineer", "Orion Tech", "Engineering", "AI Voice Interview", "15 minutes", "alreadyUsed", "[]", "2025-03-15T23:59:59Z", 5],
  ];
  for (const [token, jobTitle, company, department, interviewType, estimatedDuration, status, instructions, expiresAt, questionCount] of interviews) {
    await sql`
      INSERT INTO interviews (token, job_title, company, department, interview_type, estimated_duration, status, instructions, expires_at, question_count)
      VALUES (${token}, ${jobTitle}, ${company}, ${department}, ${interviewType}, ${estimatedDuration}, ${status}, ${instructions}::jsonb, ${expiresAt}::timestamptz, ${questionCount})
      ON CONFLICT (token) DO NOTHING
    `;
  }
  console.log("  - interviews");

  // 5. Candidates (token_created_at/token_expires_at for candidate-sourced tokens; future dates for demo links)
  const now = new Date();
  const expiresDemo = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const createdDemo = now.toISOString();
  const candidates = [
    ["1", "Jane Doe", "jane.doe@example.com", "+91 98765 43210", "Frontend Developer", 78, 85, "completed", "2025-02-10", "demo123", createdDemo, expiresDemo],
    ["2", "John Smith", "john.smith@example.com", "+91 98123 45678", "Full Stack Engineer", 82, null, "in_progress", "2025-02-11", "fe789", createdDemo, expiresDemo],
    ["3", "Sarah Wilson", "sarah.wilson@example.com", "+91 98234 56789", "Frontend Developer", 65, 72, "completed", "2025-02-09", "demo456", createdDemo, expiresDemo],
    ["4", "Michael Chen", "michael.chen@example.com", "+91 97654 32109", "Backend Developer", 91, null, "pending", null, null, null, null],
  ];
  for (const [id, name, email, phone, position, atsScore, interviewScore, status, interviewDate, token, tokenCreatedAt, tokenExpiresAt] of candidates) {
    await sql`
      INSERT INTO candidates (id, name, email, phone, position, ats_score, interview_score, status, interview_date, token, token_created_at, token_expires_at)
      VALUES (${id}, ${name}, ${email}, ${phone}, ${position}, ${atsScore}, ${interviewScore}, ${status}, ${interviewDate || null}, ${token}, ${tokenCreatedAt || null}::timestamptz, ${tokenExpiresAt || null}::timestamptz)
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log("  - candidates");

  // 6. Reports
  const reports = [
    ["1", 78, 85, JSON.stringify(["Strong React and modern frontend experience", "Clear communication during technical questions", "Good problem-solving approach"]), JSON.stringify(["Limited experience with backend technologies"]), "Proceed to next round"],
    ["2", 82, null, "[]", "[]", "Interview in progress"],
    ["3", 65, 72, JSON.stringify(["Enthusiastic about learning", "Team collaboration experience"]), JSON.stringify(["ATS score below threshold", "Limited years of experience"]), "Reject"],
  ];
  for (const [candidateId, atsScore, interviewScore, strengths, risks, recommendation] of reports) {
    await sql`
      INSERT INTO reports (candidate_id, ats_score, interview_score, strengths, risks, recommendation)
      VALUES (${candidateId}, ${atsScore}, ${interviewScore}, ${strengths}::jsonb, ${risks}::jsonb, ${recommendation})
      ON CONFLICT (candidate_id) DO NOTHING
    `;
  }
  console.log("  - reports");

  console.log("Done.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
