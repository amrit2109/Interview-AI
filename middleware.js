import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyToken } from "./lib/auth";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/admin/:path*"],
};
