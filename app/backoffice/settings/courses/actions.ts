"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/adminAuth";
import { submitChange } from "@/lib/changeFlow";
import { courseFields, courseToValues, validateCourse, type CourseErrors, type CourseField, type CourseValues } from "@/lib/courseEdit";
import { courses } from "@/lib/courses";
import type { OtpError } from "@/lib/otpErrors";
import type { PendingChange } from "@/lib/pending";

export type CourseFormState = {
  errors: CourseErrors;
  // "password" is the administrator password being wrong; "form" is a problem with the request itself;
  // the others are reasons a one-time password could not be sent while TWO_FACTOR_AUTHEN is on.
  message?: "password" | "form" | OtpError;
  values: CourseValues;
};

// The middleware already protects these pages; this repeats the check for the action itself.
function assertAdmin() {
  if (!hasAdminAccess(headers().get("authorization"), process.env.ADMIN_PASSWORD)) {
    throw new Error("Unauthorized");
  }
}

function readValues(formData: FormData): CourseValues {
  const values = {} as CourseValues;
  for (const field of courseFields) {
    values[field as CourseField] = String(formData.get(field) ?? "");
  }
  return values;
}

// Saves or resets one course. A mistake is returned so the form keeps everything that was typed;
// success redirects back to the course page (or to the one-time password page when TWO_FACTOR_AUTHEN is on).
export async function saveCourse(formData: FormData): Promise<CourseFormState | void> {
  assertAdmin();

  const key = String(formData.get("key") ?? "");
  const values = readValues(formData);
  if (!courses.some((course) => course.key === key)) return { errors: {}, message: "form", values };

  let change: PendingChange = { type: "course", key, values: null };
  if (formData.get("intent") !== "reset") {
    const result = validateCourse(values);
    if (!result.ok) return { errors: result.errors, values };
    change = { type: "course", key, values: courseToValues(result.value) };
  }

  const submitted = await submitChange(change, formData);
  if (!submitted.ok) return { errors: {}, message: submitted.error, values };
  redirect(submitted.to);
}
