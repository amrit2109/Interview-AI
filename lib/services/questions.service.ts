import { getSql } from "@/lib/db";

export interface InterviewQuestion {
  id: number;
  text: string;
}

export async function getInterviewQuestions(): Promise<{
  data: InterviewQuestion[];
  error: string | null;
}> {
  const sql = getSql();
  if (!sql) return { data: [], error: "Database not configured." };
  try {
    const rows = await sql`SELECT id, text FROM questions ORDER BY id`;
    return {
      data: rows.map((r) => ({ id: Number(r.id), text: String(r.text) })),
      error: null,
    };
  } catch (err) {
    console.error("getInterviewQuestions:", err);
    return { data: [], error: "Failed to fetch questions." };
  }
}
