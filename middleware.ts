import { NextRequest, NextResponse } from "next/server";
import { maintenanceHtml, maintenanceOn } from "@/lib/maintenance";

const isAdminPath = (path: string) =>
  path === "/admin" || path.startsWith("/admin/") || path === "/backoffice" || path.startsWith("/backoffice/");

// The pages and routes of this site only use these methods. Anything else (TRACE, PUT, ...) is refused here
// with a plain 405, instead of reaching Next.js and ending in a 500.
const ALLOWED_METHODS = ["GET", "HEAD", "POST", "OPTIONS"];

const MAX_POST_BYTES = 256 * 1024;

// The login check route is used by this middleware itself, so it stays reachable in maintenance mode.
const AUTH_CHECK_PATH = "/api/auth/check";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!ALLOWED_METHODS.includes(req.method)) {
    return new NextResponse("Method not allowed", { status: 405, headers: { Allow: ALLOWED_METHODS.join(", ") } });
  }
  if (pathname === AUTH_CHECK_PATH) return NextResponse.next();

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

  // A form posted from another site is refused before anything else (the settings forms are the only posts here).
  if (req.method === "POST") {
    const origin = req.headers.get("origin");
    let sameSite = true;
    try {
      sameSite = !origin || new URL(origin).host === req.headers.get("host");
    } catch {
      sameSite = false;
    }
    if (!sameSite) return new NextResponse("Forbidden", { status: 403 });
  }

  // The settings forms hold a few kilobytes of text. A larger post is refused before anything reads it.
  if (req.method === "POST" && Number(req.headers.get("content-length") ?? 0) > MAX_POST_BYTES) {
    return new NextResponse("Request too large", { status: 413 });
  }

  const authorization = req.headers.get("authorization");
  const challenge = { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Admin"' } };
  // The browser's first request has no login yet. Answering it only prompts, so nothing is counted.
  if (!authorization) return new NextResponse("Authentication required", challenge);

  // The tries are counted and limited in the database, which only the app's own route can reach.
  try {
    const check = await fetch(new URL(AUTH_CHECK_PATH, req.url), {
      headers: { authorization },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (check.status === 204) return NextResponse.next();
    if (check.status === 401) return new NextResponse("Authentication required", challenge);
    if (check.status === 429) {
      return new NextResponse("Too many wrong passwords. The login is locked for a while.", {
        status: 429,
        headers: { "Retry-After": check.headers.get("retry-after") ?? "900", "Cache-Control": "no-store" },
      });
    }
  } catch {
    // Falls through to the refusal below.
  }
  // The check could not run (for example the database is down): refuse rather than let anyone in unchecked.
  return new NextResponse("Login check unavailable. Try again shortly.", { status: 503, headers: { "Cache-Control": "no-store" } });
}

// Every page except Next.js's own static files, so maintenance mode can close the public site.
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
