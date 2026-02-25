import { NextRequest, NextResponse } from "next/server";
import {
  uploadResumeFromServer,
  RESUME_ALLOWED_TYPES,
  RESUME_ALLOWED_EXTENSIONS,
} from "@/lib/storage";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function getExtension(filename: string): string {
  const match = filename.toLowerCase().match(/\.(pdf|txt|docx?)$/);
  return match ? `.${match[1]}` : "";
}

function isAllowedFile(file: File): boolean {
  const ext = getExtension(file.name);
  const hasExt = ext && (RESUME_ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
  const hasType = (RESUME_ALLOWED_TYPES as readonly string[]).includes(file.type);
  return Boolean(hasExt && hasType);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const emailRaw = formData.get("email");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file selected." }, { status: 400 });
    }
    const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ error: "Email is required for resume upload." }, { status: 400 });
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
    const contentType = file.type || "application/pdf";
    const { data, error } = await uploadResumeFromServer(email, buffer, contentType);

    if (error || !data) {
      return NextResponse.json(
        { error: error ?? "Failed to upload resume." },
        { status: 502 }
      );
    }

    return NextResponse.json({ resumeLink: data.finalUrl });
  } catch (err) {
    console.error("upload-resume:", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
