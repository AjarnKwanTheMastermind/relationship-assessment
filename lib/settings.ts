import { unstable_cache } from "next/cache";
import { builtInQuestions, type Question } from "./builtInQuestions";
import { getLatestQuestionSet, getSettingRows, type SettingRow } from "./db";
import { publicQuestions } from "./questionSet";
import { asValues, validateCourse } from "./courseEdit";
import { courses as defaultCourses, type Course } from "./courses";
import { DEFAULT_LINE_URL, validateLineUrl } from "./lineLink";

export const SETTINGS_TAG = "settings";
export const LINE_URL_KEY = "line_url";
export const courseKey = (key: string) => `course:${key}`;

export type AppSettings = { lineUrl: string; courses: Course[] };

const defaults: AppSettings = { lineUrl: DEFAULT_LINE_URL, courses: defaultCourses };

function fromRows(rows: SettingRow[]): AppSettings {
  const row = rows.find((r) => r.key === LINE_URL_KEY);
  // A stored value is checked again on read, so a bad row can never put an unsafe link on the site.
  const checked = row ? validateLineUrl(row.value) : null;
  return { lineUrl: checked?.ok ? checked.value : defaults.lineUrl, courses: defaultCourses.map((course) => courseFromRows(rows, course)) };
}

// A saved course replaces the built-in one. It is checked again on read, so a damaged row falls back to the built-in text.
function courseFromRows(rows: SettingRow[], fallback: Course): Course {
  const row = rows.find((r) => r.key === courseKey(fallback.key));
  if (!row) return fallback;
  try {
    const result = validateCourse(asValues(JSON.parse(row.value)));
    return result.ok ? { key: fallback.key, ...result.value } : fallback;
  } catch {
    return fallback;
  }
}

// Public pages read through a cache, so most requests never touch the database. Saving a
// setting clears the tag at once; the time limit is a safety net.
const cachedSettings = unstable_cache(async () => fromRows(await getSettingRows()), ["app-settings"], {
  tags: [SETTINGS_TAG],
  revalidate: 300,
});

// The questions the quiz shows: the newest saved version, texts only (the scores stay on the server). It is cached
// with the same tag as the other settings, so saving a new version clears it at once.
export type PublicQuestionSet = { version: number; questions: Question[] };

const cachedQuestionSet = unstable_cache(
  async (): Promise<PublicQuestionSet | null> => {
    const latest = await getLatestQuestionSet();
    return latest ? { version: latest.version, questions: publicQuestions(latest.content) } : null;
  },
  ["question-set"],
  { tags: [SETTINGS_TAG], revalidate: 300 },
);

// Never throws: if no valid set can be read, the quiz shows the built-in questions, which are version 1.
export async function getPublicQuestionSet(): Promise<PublicQuestionSet> {
  try {
    const found = await cachedQuestionSet();
    if (found) return found;
  } catch (error) {
    console.error("Could not read the question set, using the built-in questions", error);
  }
  return { version: 1, questions: builtInQuestions };
}

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
export async function readSettingsNow(): Promise<{
  settings: AppSettings;
  updatedAt: Date | null;
  courseUpdatedAt: Record<string, Date | undefined>;
}> {
  const rows = await getSettingRows();
  const row = rows.find((r) => r.key === LINE_URL_KEY);
  const courseUpdatedAt = Object.fromEntries(
    defaultCourses.map((course) => [course.key, rows.find((r) => r.key === courseKey(course.key))?.updated_at]),
  );
  return { settings: fromRows(rows), updatedAt: row?.updated_at ?? null, courseUpdatedAt };
}
