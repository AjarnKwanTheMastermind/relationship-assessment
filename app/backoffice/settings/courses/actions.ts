"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/adminAuth";
import { passwordMatches } from "@/lib/confirmPassword";
import { courseFields, courseToValues, validateCourse, type CourseErrors, type CourseField, type CourseValues } from "@/lib/courseEdit";
import { courses } from "@/lib/courses";
import { upsertSetting } from "@/lib/db";
import { SETTINGS_TAG, courseKey } from "@/lib/settings";

export type CourseFormState = {
  errors: CourseErrors;
  // "password" is the administrator password being wrong; "form" is a problem with the request itself.
  message?: "password" | "form";
  values: CourseValues;
};

// The middleware already protects these pages; this repeats the check for the action itself.
function assertAdmin() {
  if (!hasAdminAccess(headers().get("authorization"), process.env.ADMIN_PASSWORD)) {
    throw new Error("Unauthorized");
  }
}

function publish() {
  revalidateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");
}

function readValues(formData: FormData): CourseValues {
  const values = {} as CourseValues;
  for (const field of courseFields) {
    values[field as CourseField] = String(formData.get(field) ?? "");
  }
  return values;
}

// Saves or resets one course. A mistake is returned so the form keeps everything that was typed;
// success redirects back to the course page.
export async function saveCourse(formData: FormData): Promise<CourseFormState | void> {
  assertAdmin();

  const key = String(formData.get("key") ?? "");
  const values = readValues(formData);
  if (!courses.some((course) => course.key === key)) return { errors: {}, message: "form", values };

  // Every change needs the administrator password typed again, as for the LINE link.
  if (!passwordMatches(String(formData.get("password") ?? ""), process.env.ADMIN_PASSWORD)) {
    // A short pause makes guessing the password through this form slow.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { errors: {}, message: "password", values };
  }

  const back = `/backoffice/settings/courses/${key}`;
  if (formData.get("intent") === "reset") {
    // The built-in text is written back into the row, so every course always has one.
    const { key: _key, ...builtIn } = courses.find((course) => course.key === key) as (typeof courses)[number];
    await upsertSetting(courseKey(key), JSON.stringify(courseToValues(builtIn)));
    publish();
    redirect(`${back}?saved=reset`);
  }

  const result = validateCourse(values);
  if (!result.ok) return { errors: result.errors, values };

  await upsertSetting(courseKey(key), JSON.stringify(courseToValues(result.value)));
  publish();
  redirect(`${back}?saved=1`);
}
