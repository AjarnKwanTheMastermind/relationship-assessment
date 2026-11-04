// What happens when the administrator presses Save. With TWO_FACTOR_AUTHEN off, the typed password is checked
// and the change is applied. With it on, nothing is changed until the one-time password emailed to the
// administrator is entered; the password box is not used at all.
import { randomUUID } from "node:crypto";
import { applyChange, describeChange } from "./applyChange";
import { passwordMatches } from "./confirmPassword";
import { countRecentChallenges, createChallenge, deleteChallenge } from "./db";
import { adminEmail, deliveryMode, sendOtpEmail } from "./notify";
import { hashCode, newCode, otpRules } from "./otp";
import type { OtpError } from "./otpErrors";
import { returnPath, type PendingChange } from "./pending";
import { twoFactorOn } from "./twoFactor";

export const VERIFY_PATH = "/backoffice/settings/verify";

export const devParam = (code: string | null) => (code ? `&dev=${code}` : "");

export type SubmitResult = { ok: true; to: string } | { ok: false; error: "password" | OtpError };

// Creates a one-time password for a change and emails it. Nothing is changed until it is entered.
export async function issueChallenge(change: PendingChange): Promise<{ id: string; devCode: string | null } | { error: OtpError }> {
  if (!adminEmail()) return { error: "noemail" };
  const mode = deliveryMode();
  if (mode === "unavailable") return { error: "noprovider" };
  const rules = otpRules();
  if ((await countRecentChallenges(rules.windowMinutes)) >= rules.maxRequests) return { error: "rate" };

  const { subject, changes } = await describeChange(change);
  const id = randomUUID();
  const code = newCode();
  await createChallenge(id, JSON.stringify(change), hashCode(id, code), rules.ttlMinutes);

  if (!(await sendOtpEmail(code, subject, changes, rules.ttlMinutes))) {
    await deleteChallenge(id);
    return { error: "send" };
  }
  // In development nothing is emailed, so the code is passed on to the verification page.
  return { id, devCode: mode === "console" ? code : null };
}

// The switch is read from the environment on every request, so it can never be left over from a page that was built earlier.
export async function submitChange(change: PendingChange, formData: FormData): Promise<SubmitResult> {
  if (!twoFactorOn()) {
    if (!passwordMatches(String(formData.get("password") ?? ""), process.env.ADMIN_PASSWORD)) {
      // A short pause makes guessing the password through this form slow.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { ok: false, error: "password" };
    }
    const done = await applyChange(change);
    return { ok: true, to: `${returnPath(change)}?saved=${done.saved}&mail=${done.mail}` };
  }

  const issued = await issueChallenge(change);
  if ("error" in issued) return { ok: false, error: issued.error };
  return { ok: true, to: `${VERIFY_PATH}?c=${issued.id}${devParam(issued.devCode)}` };
}
