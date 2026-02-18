import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyToken } from "./lib/auth";

const ADMIN_API_PATHS = [
  "/api/candidates/send-interview",
  "/api/candidates/analyze-resume",
];

function isAdminApiPath(pathname) {
  return ADMIN_API_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (isAdminApiPath(pathname)) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const validSession = token ? await verifyToken(token) : null;
    if (!validSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const validSession = token ? await verifyToken(token) : null;

  if (pathname === "/admin/login" || pathname === "/admin/login/") {
    if (validSession) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!validSession) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/candidates/send-interview", "/api/candidates/analyze-resume"],
};
