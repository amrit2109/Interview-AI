import { NextRequest, NextResponse } from "next/server";
import { extractTextFromResume } from "@/lib/services/resume_text_extractor";
import { parseResumeWithGemini } from "@/lib/services/resume_ai_parser";
import { scoreATS } from "@/lib/services/ats_scorer";
import { matchBestJob } from "@/lib/services/job_matcher";
import { getActiveJobDescriptions } from "@/lib/mock-api";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXT = [".pdf", ".txt", ".doc", ".docx"];

function isAllowedFile(file: File): boolean {
  const ext = file.name.toLowerCase().slice(-5);
  const hasExt = ALLOWED_EXT.some((e) => ext.endsWith(e));
  const hasType = ALLOWED_TYPES.includes(file.type);
  return hasExt || hasType;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file selected." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds maximum size (10 MB)." }, { status: 400 });
    }
    if (!isAllowedFile(file)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, TXT, or Word (DOC/DOCX)." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, error: extractError } = await extractTextFromResume(
      buffer,
      file.type,
      file.name
    );
    if (extractError || !text?.trim()) {
      return NextResponse.json(
        { error: extractError ?? "Could not extract text from resume." },
        { status: 422 }
      );
    }

    const { data: jds } = await getActiveJobDescriptions();
    const jobList = jds ?? [];
    const { candidate, error: parseError } = await parseResumeWithGemini(text, jobList);
    if (parseError || !candidate) {
      console.error("analyze-resume parse error:", parseError);
      return NextResponse.json(
        { error: parseError ?? "Failed to parse resume." },
        { status: 502 }
      );
    }

    const ats = scoreATS(candidate, jobList);
    const match = await matchBestJob(candidate, jobList);

    const response = {
      candidate: {
        fullName: candidate.fullName,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        skills: candidate.skills,
        experienceYears: candidate.experienceYears,
        experienceSummary: candidate.experienceSummary,
        education: candidate.education,
        currentOrLastRole: candidate.currentOrLastRole,
        technicalStack: candidate.technicalStack,
      },
      ats: {
        score: ats.score,
        explanation: ats.explanation,
        breakdown: ats.breakdown,
      },
      match: match
        ? {
            roleId: match.roleId,
            roleName: match.roleName,
            percentage: match.percentage,
            reasoning: match.reasoning,
            factorScores: match.factorScores,
          }
        : null,
      meta: {
        model: "gemini-2.5-flash",
        processedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("analyze-resume:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed." },
      { status: 500 }
    );
  }
}
