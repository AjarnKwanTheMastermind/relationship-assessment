import { unstable_cache } from "next/cache";
import { getSettingRows, type SettingRow } from "./db";
import { DEFAULT_LINE_URL, validateLineUrl } from "./lineLink";

export const SETTINGS_TAG = "settings";
export const LINE_URL_KEY = "line_url";

export type AppSettings = { lineUrl: string };

const defaults: AppSettings = { lineUrl: DEFAULT_LINE_URL };

function fromRows(rows: SettingRow[]): AppSettings {
  const row = rows.find((r) => r.key === LINE_URL_KEY);
  // A stored value is checked again on read, so a bad row can never put an unsafe link on the site.
  const checked = row ? validateLineUrl(row.value) : null;
  return { lineUrl: checked?.ok ? checked.value : defaults.lineUrl };
}

// Public pages read through a cache, so most requests never touch the database. Saving a
// setting clears the tag at once; the time limit is a safety net.
const cachedSettings = unstable_cache(async () => fromRows(await getSettingRows()), ["app-settings"], {
  tags: [SETTINGS_TAG],
  revalidate: 300,
});

// Never throws: if the database can't be read, pages show the defaults instead of failing.
export async function getSettings(): Promise<AppSettings> {
  try {
    return await cachedSettings();
  } catch (error) {
    console.error("Could not read settings, using defaults", error);
    return defaults;
  }
}

// For the backoffice settings page, which must always show what is stored right now.
export async function readSettingsNow(): Promise<{ settings: AppSettings; updatedAt: Date | null }> {
  const rows = await getSettingRows();
  const row = rows.find((r) => r.key === LINE_URL_KEY);
  return { settings: fromRows(rows), updatedAt: row?.updated_at ?? null };
}
