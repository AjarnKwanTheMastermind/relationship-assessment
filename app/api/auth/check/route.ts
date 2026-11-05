import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/adminAuth";
import { clearLoginFailures, lockLogin, takeLoginAttempt } from "@/lib/db";
import { loginRules } from "@/lib/loginThrottle";
import { notifyLoginLocked } from "@/lib/notify";
import { securityLog } from "@/lib/securityLog";

export const dynamic = "force-dynamic";

// The middleware cannot reach the database, so it asks this route to judge the backoffice login. Each try is
// counted before the password is compared, so a burst of parallel guesses can only get as far as the limit.
// Answers: 204 allowed, 401 wrong, 429 locked, 503 the check could not run (the middleware then refuses).
// The answer says nothing about the password, so calling this route directly gives a guesser nothing extra.
export async function GET(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  const rules = loginRules();
  const attempt = await takeLoginAttempt(rules.lockMinutes);

  if (attempt.lockedUntil && attempt.lockedUntil.getTime() > Date.now()) {
    return locked(attempt.lockedUntil);
  }
  if (attempt.attempts > rules.maxAttempts) {
    // Guesses that arrived together got past the lock check before the lock was written.
    return locked(await lockLogin(rules.lockMinutes));
  }

  if (hasAdminAccess(req.headers.get("authorization"), process.env.ADMIN_PASSWORD)) {
    await clearLoginFailures();
    return new NextResponse(null, { status: 204, headers });
  }

  securityLog("login_failed", { attempts: attempt.attempts, max: rules.maxAttempts });
  if (attempt.attempts >= rules.maxAttempts) {
    const until = await lockLogin(rules.lockMinutes);
    securityLog("login_locked", { attempts: attempt.attempts, lockMinutes: rules.lockMinutes });
    // The warning goes out once, when the limit is first reached.
    if (attempt.attempts === rules.maxAttempts) await notifyLoginLocked({ attempts: attempt.attempts, until });
    return locked(until);
  }
  return new NextResponse(null, { status: 401, headers });
}

function locked(until: Date) {
  const seconds = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 1000));
  return new NextResponse(null, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(seconds) } });
}
