"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/adminAuth";
import { applyChange } from "@/lib/applyChange";
import { VERIFY_PATH, devParam, issueChallenge, submitChange } from "@/lib/changeFlow";
import { consumeChallenge, getChallenge, retireChallenge, startAttempt } from "@/lib/db";
import { validateLineUrl } from "@/lib/lineLink";
import { codeMatches, isUuid, otpRules } from "@/lib/otp";
import { parsePending, returnPath, type PendingChange } from "@/lib/pending";

const PAGE = "/backoffice/settings";

// The middleware already protects these pages; this repeats the check for the action itself.
function assertAdmin() {
  if (!hasAdminAccess(headers().get("authorization"), process.env.ADMIN_PASSWORD)) {
    throw new Error("Unauthorized");
  }
}

// Saves or resets the LINE link. With TWO_FACTOR_AUTHEN off the typed password is checked and the change is
// applied; with it on, a one-time password is emailed and the change waits for it.
export async function saveSettings(formData: FormData) {
  assertAdmin();

  let change: PendingChange = { type: "line", value: null };
  let echo = "";

  if (formData.get("intent") !== "reset") {
    const raw = String(formData.get("lineUrl") ?? "");
    const result = validateLineUrl(raw);
    if (!result.ok) {
      redirect(`${PAGE}?error=${result.error}&value=${encodeURIComponent(raw.slice(0, 300))}`);
    }
    change = { type: "line", value: result.value };
    echo = `&value=${encodeURIComponent(result.value)}`;
  }

  const submitted = await submitChange(change, formData);
  if (!submitted.ok) redirect(`${PAGE}?error=${submitted.error}${echo}`);
  redirect(submitted.to);
}

// Applies the change only if the code is right.
export async function verifyCode(formData: FormData) {
  assertAdmin();

  const id = String(formData.get("challenge") ?? "");
  if (!isUuid(id)) redirect(PAGE);
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  // Development only: keep showing the code on the verification page after a mistake.
  const dev = String(formData.get("dev") ?? "");
  const keepDev = process.env.NODE_ENV === "development" && /^\d{6}$/.test(dev) ? devParam(dev) : "";
  if (!/^\d{6}$/.test(code)) redirect(`${VERIFY_PATH}?c=${id}&error=format${keepDev}`);

  const { maxAttempts } = otpRules();
  const attempt = await startAttempt(id, maxAttempts);
  if (!attempt) redirect(`${VERIFY_PATH}?c=${id}`);

  if (!codeMatches(attempt.code_hash, id, code)) {
    if (attempt.attempts >= maxAttempts) {
      await retireChallenge(id);
      redirect(`${VERIFY_PATH}?c=${id}&error=locked`);
    }
    redirect(`${VERIFY_PATH}?c=${id}&error=wrong&left=${maxAttempts - attempt.attempts}${keepDev}`);
  }

  if (!(await consumeChallenge(id))) redirect(`${VERIFY_PATH}?c=${id}`);

  // Checked once more, so a changed row can never put unsafe text on the site.
  const change = parsePending(attempt.payload);
  if (!change) redirect(`${PAGE}?error=invalid`);

  const done = await applyChange(change);
  redirect(`${returnPath(change)}?saved=${done.saved}&mail=${done.mail}`);
}

// Sends a fresh code for the same change. The old code stops working.
export async function resendCode(formData: FormData) {
  assertAdmin();

  const id = String(formData.get("challenge") ?? "");
  const row = isUuid(id) ? await getChallenge(id) : null;
  if (!row || row.consumed_at) redirect(isUuid(id) ? `${VERIFY_PATH}?c=${id}` : PAGE);

  const change = parsePending(row.payload);
  if (!change) redirect(PAGE);

  const issued = await issueChallenge(change);
  if ("error" in issued) redirect(`${VERIFY_PATH}?c=${id}&error=${issued.error}`);
  redirect(`${VERIFY_PATH}?c=${issued.id}&sent=1${devParam(issued.devCode)}`);
}

export async function cancelChange(formData: FormData) {
  assertAdmin();

  const id = String(formData.get("challenge") ?? "");
  if (isUuid(id)) await retireChallenge(id);
  redirect(PAGE);
}
