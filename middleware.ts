import { NextRequest, NextResponse } from "next/server";

// HTTP Basic auth for /admin. With no ADMIN_PASSWORD set, nobody can get in.
export function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  const header = req.headers.get("authorization");

  if (password && header?.startsWith("Basic ")) {
    const [user, ...rest] = atob(header.slice(6)).split(":");
    if (user === "admin" && rest.join(":") === password) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

export const config = { matcher: "/admin/:path*" };
