import { NextRequest, NextResponse } from "next/server";
import { sendInterviewInvite } from "@/lib/services/interview-invite.service";

interface SendInterviewRequestBody {
  name: string;
  email: string;
  phone?: string;
  position?: string;
  atsScore?: number;
  skills?: string;
  experienceYears?: number;
  education?: string;
  atsExplanation?: string;
  matchedRoleId?: string;
  matchPercentage?: number;
  matchReasoning?: string;
  resumeLink?: string;
}

function parseBody(body: unknown): SendInterviewRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name : "";
  const email = typeof o.email === "string" ? o.email : "";
  if (!name.trim() || !email.trim()) return null;
  return {
    name,
    email,
    phone: typeof o.phone === "string" ? o.phone : undefined,
    position: typeof o.position === "string" ? o.position : undefined,
    atsScore: typeof o.atsScore === "number" ? o.atsScore : undefined,
    skills: typeof o.skills === "string" ? o.skills : undefined,
    experienceYears: typeof o.experienceYears === "number" ? o.experienceYears : undefined,
    education: typeof o.education === "string" ? o.education : undefined,
    atsExplanation: typeof o.atsExplanation === "string" ? o.atsExplanation : undefined,
    matchedRoleId: typeof o.matchedRoleId === "string" ? o.matchedRoleId : undefined,
    matchPercentage: typeof o.matchPercentage === "number" ? o.matchPercentage : undefined,
    matchReasoning: typeof o.matchReasoning === "string" ? o.matchReasoning : undefined,
    resumeLink: typeof o.resumeLink === "string" ? o.resumeLink : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = parseBody(body);
    if (!payload) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    const { data, error, emailError } = await sendInterviewInvite(payload);

    if (error && !data) {
      const status = error.includes("required") ? 400 : 500;
      return NextResponse.json({ error }, { status });
    }

    if (error && data) {
      return NextResponse.json(
        { data, error, emailError: emailError ?? undefined },
        { status: 207 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: data!.id,
          name: data!.name,
          email: data!.email,
          phone: data!.phone,
          position: data!.position,
          token: data!.token,
          tokenCreatedAt: data!.tokenCreatedAt,
          tokenExpiresAt: data!.tokenExpiresAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("send-interview:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send interview invite." },
      { status: 500 }
    );
  }
}
