"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/adminAuth";
import { submitChange } from "@/lib/changeFlow";
import { getLatestQuestionSet } from "@/lib/db";
import type { OtpError } from "@/lib/otpErrors";
import type { PendingChange } from "@/lib/pending";
import { QUESTION_COUNT, sameSet, validateNote, validateQuestionSet, type QuestionSetErrors, type QuestionSetInput } from "@/lib/questionSet";

export type QuestionFormState = {
  errors: QuestionSetErrors;
  // "password" is the administrator password being wrong; "unchanged" is a save with nothing different from the
  // newest version; the others are reasons a one-time password could not be sent while TWO_FACTOR_AUTHEN is on.
  message?: "password" | "locked" | "unchanged" | OtpError;
  // For a wrong password, the tries that remain; for a lock, when it ends (ms since 1970).
  left?: number;
  until?: number;
  values: QuestionSetInput;
};

// The middleware already protects these pages; this repeats the check for the action itself.
function assertAdmin() {
  if (!hasAdminAccess(headers().get("authorization"), process.env.ADMIN_PASSWORD)) {
    throw new Error("Unauthorized");
  }
}

// Field names: c2t and c2n (category 2 heading and short name), q3 (question text), q3a2 (its second answer's text), q3s2 (that answer's score), note.
function readInput(formData: FormData): QuestionSetInput {
  const text = (name: string) => String(formData.get(name) ?? "");
  return {
    categories: [1, 2, 3].map((n) => ({ title: text(`c${n}t`), name: text(`c${n}n`) })),
    questions: Array.from({ length: QUESTION_COUNT }, (_, i) => ({
      question: text(`q${i + 1}`),
      options: [1, 2, 3].map((m) => ({ text: text(`q${i + 1}a${m}`), score: text(`q${i + 1}s${m}`) })),
    })),
    note: text("note"),
  };
}

// Saves the questions as a new version. A mistake is returned so the form keeps everything that was typed; success
// redirects back to the questions page (or to the one-time password page when TWO_FACTOR_AUTHEN is on).
export async function saveQuestions(formData: FormData): Promise<QuestionFormState | void> {
  assertAdmin();

  const values = readInput(formData);
  const set = validateQuestionSet(values);
  const note = validateNote(values.note);
  if (!set.ok || !note.ok) {
    return { errors: { ...(set.ok ? {} : set.errors), ...(note.ok ? {} : { note: note.error }) }, values };
  }

  // Nothing different from the newest version: no new version, no email and no code.
  const latest = await getLatestQuestionSet();
  if (latest && sameSet(latest.content, set.value)) return { errors: {}, message: "unchanged", values };

  const change: PendingChange = { type: "questions", content: set.value, note: note.value };
  const submitted = await submitChange(change, formData);
  if (!submitted.ok) {
    const detail = submitted.error === "password" ? { left: submitted.left } : submitted.error === "locked" ? { until: submitted.until } : {};
    return { errors: {}, message: submitted.error, values, ...detail };
  }
  redirect(submitted.to);
}
