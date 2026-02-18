import { NextRequest, NextResponse } from "next/server";
import {
  getCandidateByInterviewToken,
  markInterviewRecordingFailed,
} from "@/lib/services/candidate.service";

interface FailBody {
  reason?: string;
}

function parseBody(body: unknown): FailBody {
  if (!body || typeof body !== "object") return {};
  const o = body as Record<string, unknown>;
  const reason = typeof o.reason === "string" ? o.reason : undefined;
  return { reason };
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

  let body: FailBody = {};
  try {
    const raw = await request.json().catch(() => ({}));
    body = parseBody(raw);
  } catch {
    // Empty body is acceptable
  }

  const result = await markInterviewRecordingFailed({
    token: token.trim(),
    reason: body.reason ?? "Recording terminated unexpectedly",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to mark recording as failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
