"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/adminAuth";
import {
  consumeChallenge,
  countRecentChallenges,
  createChallenge,
  deleteChallenge,
  deleteSetting,
  getChallenge,
  retireChallenge,
  startAttempt,
  upsertSetting,
} from "@/lib/db";
import { validateLineUrl } from "@/lib/lineLink";
import { adminEmail, deliveryMode, sendOtpEmail } from "@/lib/mailer";
import {
  MAX_ATTEMPTS,
  MAX_REQUESTS,
  OTP_TTL_MINUTES,
  REQUEST_WINDOW_MINUTES,
  changeSummary,
  codeMatches,
  hashCode,
  isUuid,
  newCode,
  type ChallengeAction,
} from "@/lib/otp";
import { LINE_URL_KEY, SETTINGS_TAG } from "@/lib/settings";

const PAGE = "/backoffice/settings";
const VERIFY = "/backoffice/settings/verify";

// The middleware already protects these pages; this repeats the check for the action itself.
function assertAdmin() {
  if (!hasAdminAccess(headers().get("authorization"), process.env.ADMIN_PASSWORD)) {
    throw new Error("Unauthorized");
  }
}

// Public pages are cached, so a saved setting must clear both the data and the pages built from it.
function publish() {
  revalidateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");
}

// Creates a one-time password for a change and emails it. Nothing is changed until it is entered.
async function issueChallenge(action: ChallengeAction, payload: string | null) {
  const to = adminEmail();
  if (!to) return { error: "noemail" } as const;
  const mode = deliveryMode();
  if (mode === "unavailable") return { error: "noprovider" } as const;
  if ((await countRecentChallenges(REQUEST_WINDOW_MINUTES)) >= MAX_REQUESTS) return { error: "rate" } as const;

  const id = randomUUID();
  const code = newCode();
  await createChallenge(id, action, payload, hashCode(id, code), OTP_TTL_MINUTES);

  if (!(await sendOtpEmail(to, code, changeSummary(action, payload), OTP_TTL_MINUTES))) {
    await deleteChallenge(id);
    return { error: "send" } as const;
  }
  // In development nothing is emailed, so the code is passed on to the verification page.
  return { id, devCode: mode === "console" ? code : null } as const;
}

const devParam = (code: string | null) => (code ? `&dev=${code}` : "");

// Step 1: check the requested change, then email a one-time password.
export async function requestChange(formData: FormData) {
  assertAdmin();

  let action: ChallengeAction = "reset_line_url";
  let payload: string | null = null;
  let echo = "";

  if (formData.get("intent") !== "reset") {
    const raw = String(formData.get("lineUrl") ?? "");
    const result = validateLineUrl(raw);
    if (!result.ok) {
      redirect(`${PAGE}?error=${result.error}&value=${encodeURIComponent(raw.slice(0, 300))}`);
    }
    action = "set_line_url";
    payload = result.value;
    echo = `&value=${encodeURIComponent(result.value)}`;
  }

  const issued = await issueChallenge(action, payload);
  if ("error" in issued) redirect(`${PAGE}?error=${issued.error}${echo}`);
  redirect(`${VERIFY}?c=${issued.id}${devParam(issued.devCode)}`);
}

// Step 2: apply the change only if the code is right.
export async function verifyCode(formData: FormData) {
  assertAdmin();

  const id = String(formData.get("challenge") ?? "");
  if (!isUuid(id)) redirect(PAGE);
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  // Development only: keep showing the code on the verification page after a mistake.
  const dev = String(formData.get("dev") ?? "");
  const keepDev = process.env.NODE_ENV === "development" && /^\d{6}$/.test(dev) ? devParam(dev) : "";
  if (!/^\d{6}$/.test(code)) redirect(`${VERIFY}?c=${id}&error=format${keepDev}`);

  const attempt = await startAttempt(id, MAX_ATTEMPTS);
  if (!attempt) redirect(`${VERIFY}?c=${id}`);

  if (!codeMatches(attempt.code_hash, id, code)) {
    if (attempt.attempts >= MAX_ATTEMPTS) {
      await retireChallenge(id);
      redirect(`${VERIFY}?c=${id}&error=locked`);
    }
    redirect(`${VERIFY}?c=${id}&error=wrong&left=${MAX_ATTEMPTS - attempt.attempts}${keepDev}`);
  }

  if (!(await consumeChallenge(id))) redirect(`${VERIFY}?c=${id}`);

  if (attempt.action === "reset_line_url") {
    await deleteSetting(LINE_URL_KEY);
    publish();
    redirect(`${PAGE}?saved=reset`);
  }

  // Checked once more, so a changed row can never put an unsafe link on the site.
  const result = validateLineUrl(attempt.payload ?? "");
  if (!result.ok) redirect(`${PAGE}?error=${result.error}`);
  await upsertSetting(LINE_URL_KEY, result.value);
  publish();
  redirect(`${PAGE}?saved=1`);
}

// Sends a fresh code for the same change. The old code stops working.
export async function resendCode(formData: FormData) {
  assertAdmin();

  const id = String(formData.get("challenge") ?? "");
  const row = isUuid(id) ? await getChallenge(id) : null;
  if (!row || row.consumed_at) redirect(isUuid(id) ? `${VERIFY}?c=${id}` : PAGE);

  const issued = await issueChallenge(row.action, row.payload);
  if ("error" in issued) redirect(`${VERIFY}?c=${id}&error=${issued.error}`);
  redirect(`${VERIFY}?c=${issued.id}&sent=1${devParam(issued.devCode)}`);
}

export async function cancelChange(formData: FormData) {
  assertAdmin();

  const id = String(formData.get("challenge") ?? "");
  if (isUuid(id)) await retireChallenge(id);
  redirect(PAGE);
}
