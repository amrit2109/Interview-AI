import { sql } from "@/lib/db";

export interface JobDescription {
  id: string;
  jobName: string;
  description: string;
  openings: number;
}

function toJobDescription(row: Record<string, unknown> | null): JobDescription | null {
  if (!row) return null;
  return {
    id: String(row.id),
    jobName: String(row.job_name),
    description: String(row.description),
    openings: Number(row.openings),
  };
}

export async function getJobDescriptions(): Promise<{ data: JobDescription[]; error: string | null }> {
  if (!sql) return { data: [], error: "Database not configured." };
  try {
    const rows = await sql`SELECT * FROM job_descriptions ORDER BY id`;
    return { data: rows.map((r) => toJobDescription(r)).filter(Boolean) as JobDescription[], error: null };
  } catch (err) {
    console.error("getJobDescriptions:", err);
    return { data: [], error: "Failed to fetch job descriptions." };
  }
}

export async function getActiveJobDescriptions(): Promise<{ data: JobDescription[]; error: string | null }> {
  if (!sql) return { data: [], error: "Database not configured." };
  try {
    const rows = await sql`SELECT * FROM job_descriptions WHERE openings > 0 ORDER BY id`;
    return { data: rows.map((r) => toJobDescription(r)).filter(Boolean) as JobDescription[], error: null };
  } catch (err) {
    console.error("getActiveJobDescriptions:", err);
    return { data: [], error: "Failed to fetch active job descriptions." };
  }
}

export async function createJobDescription(payload: {
  jobName?: string;
  description?: string;
  openings?: number;
}): Promise<{ data: JobDescription | null; error: string | null }> {
  if (!sql) return { data: null, error: "Database not configured." };
  const { jobName, description, openings } = payload ?? {};
  if (!jobName?.trim()) return { data: null, error: "Job name is required." };
  if (!description?.trim()) return { data: null, error: "Description is required." };
  let validOpenings = 1;
  if (openings !== undefined && openings !== null) {
    const parsed = Number(openings);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return { data: null, error: "Number of openings must be an integer at least 1." };
    }
    validOpenings = parsed;
  }
  try {
    const sanitizedJobName = jobName.trim();
    const sanitizedDescription = description.trim();
    const result = await sql`
      INSERT INTO job_descriptions (job_name, description, openings)
      VALUES (${sanitizedJobName}, ${sanitizedDescription}, ${validOpenings})
      RETURNING id, job_name, description, openings
    `;
    const row = result[0];
    return {
      data: {
        id: String(row?.id ?? ""),
        jobName: sanitizedJobName,
        description: sanitizedDescription,
        openings: validOpenings,
      },
      error: null,
    };
  } catch (err) {
    console.error("createJobDescription:", err);
    return { data: null, error: "Failed to create job description." };
  }
}

export async function updateJobDescriptionOpeningsById({
  job_description_id,
  openings,
}: {
  job_description_id: string | number;
  openings: number;
}): Promise<{ ok: boolean; data?: JobDescription; error_message?: string }> {
  if (!sql) return { ok: false, error_message: "Database not configured." };
  const id = job_description_id == null ? null : String(job_description_id).trim();
  if (!id) return { ok: false, error_message: "Job description ID is required." };
  const parsed = Number(openings);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return { ok: false, error_message: "Openings must be a non-negative integer." };
  }
  try {
    const result = await sql`
      UPDATE job_descriptions SET openings = ${parsed}
      WHERE id = ${id}
      RETURNING id, job_name, description, openings
    `;
    if (!result?.length) return { ok: false, error_message: "Job description not found." };
    return { ok: true, data: toJobDescription(result[0]) ?? undefined };
  } catch (err) {
    console.error("updateJobDescriptionOpeningsById:", err);
    return { ok: false, error_message: "Failed to update openings." };
  }
}

export async function deleteJobDescriptionById({
  job_description_id,
}: {
  job_description_id: string | number;
}): Promise<{ ok: boolean; deleted_id?: string; error_message?: string }> {
  if (!sql) return { ok: false, error_message: "Database not configured." };
  const id = job_description_id == null ? null : String(job_description_id).trim();
  if (!id) return { ok: false, error_message: "Job description ID is required." };
  try {
    const result = await sql`DELETE FROM job_descriptions WHERE id = ${id} RETURNING id`;
    if (!result?.length) return { ok: false, error_message: "Job description not found or already deleted." };
    return { ok: true, deleted_id: String(result[0]?.id) };
  } catch (err) {
    console.error("deleteJobDescriptionById:", err);
    return { ok: false, error_message: "Failed to delete job description." };
  }
}
