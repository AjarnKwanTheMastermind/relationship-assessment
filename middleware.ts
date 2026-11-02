import { NextRequest, NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/adminAuth";

// HTTP Basic auth for /admin and /backoffice. With no ADMIN_PASSWORD set, nobody can get in.
export function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    // A distinct status, so a missing setting isn't mistaken for a wrong password.
    return new NextResponse("ADMIN_PASSWORD is not set for this deployment", { status: 503 });
  }

  if (hasAdminAccess(req.headers.get("authorization"), password)) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

export const config = { matcher: ["/admin/:path*", "/backoffice/:path*"] };
