// The one place where a settings change is written. A change reaches it either straight from the form
// (after the password) or after its one-time password was entered, so both paths behave the same.
import { revalidatePath, revalidateTag } from "next/cache";
import { courseToValues, type CourseValues } from "./courseEdit";
import { courses } from "./courses";
import { deleteSetting, getLatestQuestionSet, insertQuestionSet, upsertSetting } from "./db";
import { DEFAULT_LINE_URL } from "./lineLink";
import { diffCourse, notifySettingsChanged, type Change, type MailStatus } from "./notify";
import type { PendingChange } from "./pending";
import { diffQuestionSets, sameSet } from "./questionSet";
import { LINE_URL_KEY, SETTINGS_TAG, courseKey, readSettingsNow } from "./settings";

function builtInValues(key: string): CourseValues {
  const { key: _key, ...content } = courses.find((course) => course.key === key) as (typeof courses)[number];
  return courseToValues(content);
}

// What the change would alter, for the code email, the verification page and the warning email.
export async function describeChange(change: PendingChange): Promise<{ subject: string; changes: Change[] }> {
  let current: Awaited<ReturnType<typeof readSettingsNow>> | null = null;
  try {
    current = await readSettingsNow();
  } catch {
    // The description is only informative, so an unreadable database must not stop it.
  }

  if (change.type === "questions") {
    let latest: Awaited<ReturnType<typeof getLatestQuestionSet>> = null;
    try {
      latest = await getLatestQuestionSet();
    } catch {
      // The description is only informative, so an unreadable database must not stop it.
    }
    return { subject: "ชุดคำถามและคำตอบของแบบประเมิน", changes: diffQuestionSets(latest?.content ?? null, change.content) };
  }

  if (change.type === "line") {
    const before = current?.settings.lineUrl ?? null;
    const after = change.value ?? DEFAULT_LINE_URL;
    return {
      subject: "การตั้งค่าลิงก์ LINE",
      changes: before === after ? [] : [{ label: "ลิงก์ LINE Official Account", before: before ?? "(ไม่ทราบ)", after }],
    };
  }

  const course = current?.settings.courses.find((c) => c.key === change.key);
  const title = course?.title ?? courses.find((c) => c.key === change.key)?.title ?? change.key;
  const after = change.values ?? builtInValues(change.key);
  return {
    subject: `ข้อมูลคอร์ส "${title}"`,
    changes: diffCourse(title, course ? courseToValues(course) : null, after),
  };
}

export async function applyChange(change: PendingChange): Promise<{ saved: "1" | "reset" | "unchanged"; mail: MailStatus }> {
  const { subject, changes } = await describeChange(change);

  // Questions are never overwritten: every save is a new version, and identical content saves nothing.
  if (change.type === "questions") {
    const latest = await getLatestQuestionSet();
    if (latest && sameSet(latest.content, change.content)) {
      return { saved: "unchanged", mail: "off" };
    }
    const version = await insertQuestionSet(change.content, change.note);
    revalidateTag(SETTINGS_TAG);
    revalidatePath("/", "layout");
    const mail = await notifySettingsChanged({
      subject,
      action: "save",
      changes: [
        { label: "เวอร์ชันของชุดคำถาม", before: latest ? String(latest.version) : "(ไม่มี)", after: String(version) },
        ...(change.note ? [{ label: "หมายเหตุการแก้ไข", before: "(ว่าง)", after: change.note }] : []),
        ...changes,
      ],
    });
    return { saved: "1", mail };
  }

  const reset = change.type === "line" ? change.value === null : change.values === null;

  if (change.type === "line") {
    if (change.value === null) await deleteSetting(LINE_URL_KEY);
    else await upsertSetting(LINE_URL_KEY, change.value);
  } else {
    await upsertSetting(courseKey(change.key), JSON.stringify(change.values ?? builtInValues(change.key)));
  }

  // Public pages are cached, so a saved setting must clear both the data and the pages built from it.
  revalidateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");

  const mail = await notifySettingsChanged({ subject, action: reset ? "reset" : "save", changes });
  return { saved: reset ? "reset" : "1", mail };
}
