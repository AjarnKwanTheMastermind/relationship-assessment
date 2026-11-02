"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/adminAuth";
import { passwordMatches } from "@/lib/confirmPassword";
import { deleteSetting, upsertSetting } from "@/lib/db";
import { validateLineUrl } from "@/lib/lineLink";
import { LINE_URL_KEY, SETTINGS_TAG } from "@/lib/settings";

const PAGE = "/backoffice/settings";

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

// Every change needs the administrator password typed again, so an open browser session alone can't change settings.
async function confirmPassword(formData: FormData, echo: string) {
  if (passwordMatches(String(formData.get("password") ?? ""), process.env.ADMIN_PASSWORD)) return;
  // A short pause makes guessing the password through this form slow.
  await new Promise((resolve) => setTimeout(resolve, 1000));
  redirect(`${PAGE}?error=password${echo}`);
}

export async function saveSettings(formData: FormData) {
  assertAdmin();

  if (formData.get("intent") === "reset") {
    await confirmPassword(formData, "");
    await deleteSetting(LINE_URL_KEY);
    publish();
    redirect(`${PAGE}?saved=reset`);
  }

  const raw = String(formData.get("lineUrl") ?? "");
  const result = validateLineUrl(raw);
  if (!result.ok) {
    redirect(`${PAGE}?error=${result.error}&value=${encodeURIComponent(raw.slice(0, 300))}`);
  }
  await confirmPassword(formData, `&value=${encodeURIComponent(result.value)}`);
  await upsertSetting(LINE_URL_KEY, result.value);
  publish();
  redirect(`${PAGE}?saved=1`);
}
