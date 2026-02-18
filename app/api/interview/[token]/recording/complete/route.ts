import { NextRequest, NextResponse } from "next/server";
import {
  getCandidateByInterviewToken,
  completeInterviewRecording,
} from "@/lib/services/candidate.service";
import { verifyObjectExists, getRecordingPrefixForToken } from "@/lib/storage";

interface CompleteBody {
  objectKey?: string;
  finalUrl?: string;
}

function parseBody(body: unknown): CompleteBody | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const objectKey = typeof o.objectKey === "string" ? o.objectKey : undefined;
  const finalUrl = typeof o.finalUrl === "string" ? o.finalUrl : undefined;
  if (!objectKey?.trim() || !finalUrl?.trim()) return null;
  return { objectKey: objectKey.trim(), finalUrl: finalUrl.trim() };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token?.trim()) {
    return NextResponse.json(
      { error: "Invalid or missing token." },
      { status: 400 }
    );
  }

  const validation = await getCandidateByInterviewToken(token.trim());
  if (!validation.valid || !validation.candidate) {
    return NextResponse.json(
      { error: validation.error ?? "Invalid or expired interview link." },
      { status: 403 }
    );
  }

  let body: CompleteBody | null = null;
  try {
    body = parseBody(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }
  if (!body) {
    return NextResponse.json(
      { error: "objectKey and finalUrl are required." },
      { status: 400 }
    );
  }

  const expectedPrefix = getRecordingPrefixForToken(token.trim());
  if (!body.objectKey.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { error: "Invalid object key for this interview." },
      { status: 400 }
    );
  }

  const { exists, error: verifyError } = await verifyObjectExists(body.objectKey);
  if (verifyError || !exists) {
    return NextResponse.json(
      { error: "Upload verification failed. Recording may not have been uploaded." },
      { status: 400 }
    );
  }

  const result = await completeInterviewRecording({
    token: token.trim(),
    interviewLink: body.finalUrl,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to save recording." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
