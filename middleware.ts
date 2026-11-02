import { NextRequest, NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/adminAuth";
import { maintenanceHtml, maintenanceOn } from "@/lib/maintenance";

const isAdminPath = (path: string) =>
  path === "/admin" || path.startsWith("/admin/") || path === "/backoffice" || path.startsWith("/backoffice/");

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isAdminPath(pathname)) {
    // Maintenance mode closes everything public. The backoffice below stays reachable, so the
    // administrator can still work while visitors are kept out.
    if (!maintenanceOn(process.env.MAINTENANCE_MODE)) return NextResponse.next();

    const headers = { "Retry-After": "3600", "Cache-Control": "no-store" };
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "maintenance" }, { status: 503, headers });
    }
    return new NextResponse(maintenanceHtml, {
      status: 503,
      headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // HTTP Basic auth for /admin and /backoffice. With no ADMIN_PASSWORD set, nobody can get in.
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

// Every page except Next.js's own static files, so maintenance mode can close the public site.
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
