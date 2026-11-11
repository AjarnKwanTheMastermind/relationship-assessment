// Editable course information: field list, limits and validation. Pure functions, so the edit form
// (client) and the server action and settings reader (server) all use the same rules.
import type { Course } from "./courses";

export type CourseField =
  | "title"
  | "titleEn"
  | "price"
  | "fullPrice"
  | "priceNote"
  | "summary"
  | "details"
  | "modules"
  | "benefits"
  | "suitable";

// What the form holds and what is stored: every field is text, and a list is one item per line.
export type CourseValues = Record<CourseField, string>;
export type CourseContent = Omit<Course, "key">;

export const MAX_LIST_ITEMS = 20;

type FieldRule = { required: boolean; max: number; list?: boolean };

export const fieldRules: Record<CourseField, FieldRule> = {
  title: { required: true, max: 100 },
  titleEn: { required: true, max: 100 },
  price: { required: true, max: 30 },
  fullPrice: { required: false, max: 30 },
  priceNote: { required: false, max: 500 },
  summary: { required: true, max: 500 },
  details: { required: true, max: 300, list: true },
  modules: { required: false, max: 300, list: true },
  benefits: { required: false, max: 300, list: true },
  suitable: { required: false, max: 1000 },
};

export const courseFields = Object.keys(fieldRules) as CourseField[];

export type CourseErrors = Partial<Record<CourseField, string>>;
export type CourseResult = { ok: true; value: CourseContent } | { ok: false; errors: CourseErrors };

// Control characters and text-direction overrides are dropped; Thai and every other script pass through.
const UNSAFE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/g;
const clean = (text: string) => text.replace(UNSAFE, "");
export const oneLine = (text: string) => clean(text).replace(/\s+/g, " ").trim();

export function courseToValues(course: CourseContent): CourseValues {
  return {
    title: course.title,
    titleEn: course.titleEn,
    price: course.price,
    fullPrice: course.fullPrice ?? "",
    priceNote: course.priceNote ?? "",
    summary: course.summary,
    details: course.details.join("\n"),
    modules: (course.modules ?? []).join("\n"),
    benefits: (course.benefits ?? []).join("\n"),
    suitable: course.suitable ?? "",
  };
}

// Anything that is not text counts as empty, so a damaged stored value can't break the page.
export function asValues(input: unknown): Partial<Record<CourseField, string>> {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const out: Partial<Record<CourseField, string>> = {};
  for (const field of courseFields) {
    const value = source[field];
    out[field] = typeof value === "string" ? value : "";
  }
  return out;
}

export function validateCourse(input: Partial<Record<CourseField, string>>): CourseResult {
  const errors: CourseErrors = {};
  const text: Partial<Record<CourseField, string>> = {};
  const lists: Partial<Record<CourseField, string[]>> = {};

  for (const field of courseFields) {
    const rule = fieldRules[field];
    const raw = input[field] ?? "";
    if (rule.list) {
      const items = clean(raw)
        .split(/\r?\n/)
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean);
      lists[field] = items;
      if (rule.required && items.length === 0) errors[field] = "กรุณากรอกอย่างน้อย 1 รายการ";
      else if (items.length > MAX_LIST_ITEMS) errors[field] = `มีได้ไม่เกิน ${MAX_LIST_ITEMS} รายการ`;
      else if (items.some((item) => item.length > rule.max)) errors[field] = `แต่ละรายการยาวได้ไม่เกิน ${rule.max} ตัวอักษร`;
    } else {
      const value = oneLine(raw);
      text[field] = value;
      if (rule.required && !value) errors[field] = "กรุณากรอกข้อมูล";
      else if (value.length > rule.max) errors[field] = `ยาวเกินไป (ไม่เกิน ${rule.max} ตัวอักษร)`;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title: text.title as string,
      titleEn: text.titleEn as string,
      price: text.price as string,
      fullPrice: text.fullPrice || undefined,
      priceNote: text.priceNote || undefined,
      summary: text.summary as string,
      details: lists.details as string[],
      modules: lists.modules?.length ? lists.modules : undefined,
      benefits: lists.benefits?.length ? lists.benefits : undefined,
      suitable: text.suitable || undefined,
    },
  };
}
