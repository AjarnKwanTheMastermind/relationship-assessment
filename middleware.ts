import { NextRequest, NextResponse } from "next/server";

function readCredentials(header: string | null) {
  if (!header?.startsWith("Basic ")) return null;
  try {
    // Browsers send UTF-8, so non-English passwords need decoding from bytes.
    const bytes = Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0));
    const [user, ...rest] = new TextDecoder().decode(bytes).split(":");
    return { user, password: rest.join(":") };
  } catch {
    return null;
  }
}

// HTTP Basic auth for /admin and /backoffice. With no ADMIN_PASSWORD set, nobody can get in.
export function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    // A distinct status, so a missing setting isn't mistaken for a wrong password.
    return new NextResponse("ADMIN_PASSWORD is not set for this deployment", { status: 503 });
  }

  const credentials = readCredentials(req.headers.get("authorization"));
  if (credentials?.user === "admin" && credentials.password === password) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

export const config = { matcher: ["/admin/:path*", "/backoffice/:path*"] };
