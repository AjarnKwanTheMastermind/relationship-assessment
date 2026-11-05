// What happens when the administrator presses Save. With TWO_FACTOR_AUTHEN off, the typed password is checked
// (with a limit on wrong tries) and the change is applied. With it on, nothing is changed until the
// one-time password emailed to the administrator is entered; the password box is not used at all.
import { randomUUID } from "node:crypto";
import { applyChange, describeChange } from "./applyChange";
import { passwordMatches } from "./confirmPassword";
import {
  clearPasswordFailures,
  createChallengeLimited,
  deleteChallenge,
  lockPassword,
  takePasswordAttempt,
} from "./db";
import { adminEmail, deliveryMode, notifyPasswordLocked, sendOtpEmail } from "./notify";
import { hashCode, newCode, otpRules } from "./otp";
import type { OtpError } from "./otpErrors";
import { passwordRules } from "./passwordLock";
import { securityLog } from "./securityLog";
import { returnPath, type PendingChange } from "./pending";
import { twoFactorOn } from "./twoFactor";

export const VERIFY_PATH = "/backoffice/settings/verify";

export const devParam = (code: string | null) => (code ? `&dev=${code}` : "");

export type SubmitFailure =
  | { error: "password"; left: number } // wrong password, with the tries that remain
  | { error: "locked"; until: number } // too many wrong passwords; until is when the lock ends (ms since 1970)
  | { error: OtpError };

export type SubmitResult = { ok: true; to: string } | ({ ok: false } & SubmitFailure);

// The part of an address that tells the settings page what went wrong.
export function failureQuery(failure: SubmitFailure): string {
  if (failure.error === "password") return `error=password&left=${failure.left}`;
  if (failure.error === "locked") return `error=locked&until=${failure.until}`;
  return `error=${failure.error}`;
}

// Creates a one-time password for a change and emails it. Nothing is changed until it is entered.
export async function issueChallenge(change: PendingChange): Promise<{ id: string; devCode: string | null } | { error: OtpError }> {
  if (!adminEmail()) return { error: "noemail" };
  const mode = deliveryMode();
  if (mode === "unavailable") return { error: "noprovider" };
  const rules = otpRules();
  const id = randomUUID();
  const code = newCode();
  // The limit is checked and the code stored in one locked step, so parallel requests cannot get past it.
  const created = await createChallengeLimited(id, JSON.stringify(change), hashCode(id, code), rules.ttlMinutes, rules.windowMinutes, rules.maxRequests);
  if (!created) {
    securityLog("otp_rate_limited", { max: rules.maxRequests, windowMinutes: rules.windowMinutes });
    return { error: "rate" };
  }

  let sent = false;
  try {
    const { subject, changes } = await describeChange(change);
    sent = await sendOtpEmail(code, subject, changes, rules.ttlMinutes);
  } finally {
    if (!sent) await deleteChallenge(id);
  }
  if (!sent) return { error: "send" };
  securityLog("otp_requested", {});
  // In development nothing is emailed, so the code is passed on to the verification page.
  return { id, devCode: mode === "console" ? code : null };
}

// Checks the administrator password with a limit on wrong tries. The try is counted before the
// password is compared, so a burst of parallel guesses can only get as far as the limit.
async function checkPassword(formData: FormData): Promise<SubmitFailure | null> {
  const rules = passwordRules();
  const attempt = await takePasswordAttempt(rules.lockMinutes);

  if (attempt.lockedUntil && attempt.lockedUntil.getTime() > Date.now()) {
    securityLog("password_locked", { refused: true });
    return { error: "locked", until: attempt.lockedUntil.getTime() };
  }
  if (attempt.attempts > rules.maxAttempts) {
    // Guesses that arrived together got past the lock check before the lock was written.
    return { error: "locked", until: (await lockPassword(rules.lockMinutes)).getTime() };
  }

  if (passwordMatches(String(formData.get("password") ?? ""), process.env.ADMIN_PASSWORD)) {
    await clearPasswordFailures();
    return null;
  }

  securityLog("password_failed", { attempts: attempt.attempts, max: rules.maxAttempts });
  // A short pause makes guessing the password through this form slow.
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (attempt.attempts >= rules.maxAttempts) {
    const until = await lockPassword(rules.lockMinutes);
    securityLog("password_locked", { attempts: attempt.attempts, lockMinutes: rules.lockMinutes });
    // The warning goes out once, when the limit is first reached.
    if (attempt.attempts === rules.maxAttempts) await notifyPasswordLocked({ attempts: attempt.attempts, until });
    return { error: "locked", until: until.getTime() };
  }
  return { error: "password", left: rules.maxAttempts - attempt.attempts };
}

// The switch is read from the environment on every request, so it can never be left over from a page that was built earlier.
export async function submitChange(change: PendingChange, formData: FormData): Promise<SubmitResult> {
  if (!twoFactorOn()) {
    const failure = await checkPassword(formData);
    if (failure) return { ok: false, ...failure };
    const done = await applyChange(change);
    securityLog("change_applied", { how: "password" });
    return { ok: true, to: `${returnPath(change)}?saved=${done.saved}&mail=${done.mail}` };
  }

  const issued = await issueChallenge(change);
  if ("error" in issued) return { ok: false, error: issued.error };
  return { ok: true, to: `${VERIFY_PATH}?c=${issued.id}${devParam(issued.devCode)}` };
}
