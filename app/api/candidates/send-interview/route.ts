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
  };
}

export async function POST(request: NextRequest) {
  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/a062950e-dd39-4c19-986f-667c51ac69a7", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "send-interview/route.ts:POST",
      message: "API entry",
      data: { step: "entry" },
      timestamp: Date.now(),
      hypothesisId: "H5",
    }),
  }).catch(() => {});
  // #endregion
  try {
    const body = await request.json();
    const payload = parseBody(body);
    if (!payload) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    const { data, error } = await sendInterviewInvite(payload);
    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/a062950e-dd39-4c19-986f-667c51ac69a7", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "send-interview/route.ts:POST",
        message: "sendInterviewInvite result",
        data: { hasData: !!data, error, errorMsg: error?.slice(0, 200) },
        timestamp: Date.now(),
        hypothesisId: "H5",
      }),
    }).catch(() => {});
    // #endregion

    if (error && !data) {
      const status = error.includes("required") ? 400 : 500;
      return NextResponse.json({ error }, { status });
    }

    if (error && data) {
      return NextResponse.json(
        { data, error },
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
    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/a062950e-dd39-4c19-986f-667c51ac69a7", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "send-interview/route.ts:catch",
        message: "API catch",
        data: {
          errName: err instanceof Error ? err.name : "unknown",
          errMsg: err instanceof Error ? err.message : String(err),
          errStack: err instanceof Error ? err.stack?.slice(0, 500) : undefined,
        },
        timestamp: Date.now(),
        hypothesisId: "H5",
      }),
    }).catch(() => {});
    // #endregion
    console.error("send-interview:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send interview invite." },
      { status: 500 }
    );
  }
}
