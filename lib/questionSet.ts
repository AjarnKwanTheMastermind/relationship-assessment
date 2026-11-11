// A set of questions and answers, as the quiz uses it: the data shapes, the rules for a valid set, the change list
// for the notification email, and the public view that has no scores. Pure functions, so the edit form (client),
// the server action and the readers (server) all use the same rules. Every saved set is one immutable version in
// the `question_sets` table; a response stores the version it was answered against.
import { CATEGORY_NAMES, CATEGORY_TITLES, builtInQuestions, type Question } from "./builtInQuestions";
import { oneLine } from "./courseEdit";
import type { Change } from "./notify";

export type Score = 0 | 1 | 2;
export type AnswerDef = { text: string; score: Score };
export type QuestionDef = {
  id: number;
  category: 1 | 2 | 3;
  question: string;
  // Always three answers. Their scores are 0, 1 and 2, one each, in any order.
  options: [AnswerDef, AnswerDef, AnswerDef];
};
// The text of a category: the heading above its questions, and the short name shown on the result page. Which
// questions belong to which category is fixed; only this text can be edited.
export type CategoryDef = { title: string; name: string };
export type QuestionSetContent = { categories: [CategoryDef, CategoryDef, CategoryDef]; questions: QuestionDef[] };

// The questions are fixed: their number, order and category never change. Only the wording and the scores do.
export const QUESTION_COUNT = builtInQuestions.length;
export const MAX_QUESTION_LENGTH = 300;
export const MAX_ANSWER_LENGTH = 300;
export const MAX_NOTE_LENGTH = 300;
export const MAX_CATEGORY_TITLE_LENGTH = 150;
export const MAX_CATEGORY_NAME_LENGTH = 100;

export const scoreLabels: Record<Score, string> = { 0: "0 คะแนน (รุนแรง)", 1: "1 คะแนน (ปานกลาง)", 2: "2 คะแนน (ดี)" };

function builtInCategories(): QuestionSetContent["categories"] {
  return ([1, 2, 3] as const).map((n) => ({ title: CATEGORY_TITLES[n], name: CATEGORY_NAMES[n] })) as QuestionSetContent["categories"];
}

// The built-in set is version 1: the answers run from worst to best, so the position is also the score.
export function builtInContent(): QuestionSetContent {
  return {
    categories: builtInCategories(),
    questions: builtInQuestions.map((q) => ({
      id: q.id,
      category: q.category,
      question: q.question,
      options: q.options.map((text, score) => ({ text, score: score as Score })) as QuestionDef["options"],
    })),
  };
}

// What the edit form holds and sends: every value is text, and a score is "0", "1" or "2" (or empty).
export type QuestionSetInput = {
  categories: { title: string; name: string }[];
  questions: { question: string; options: { text: string; score: string }[] }[];
  note: string;
};

// Keys: "c2t" the heading of category 2, "c2n" its short name, "q3" the question text, "q3a2" the text of its second answer, "q3a2s" its score, "q3s" the scores together
// (they must be 0, 1 and 2, one each), "note", and "form" for a problem with the set as a whole.
export type QuestionSetErrors = Record<string, string>;
export type QuestionSetResult = { ok: true; value: QuestionSetContent } | { ok: false; errors: QuestionSetErrors };

export const scoreRuleMessage = "คะแนนของคำตอบทั้ง 3 ข้อต้องเป็น 0, 1 และ 2 อย่างละ 1 คำตอบ ห้ามซ้ำกัน";

function readScore(value: unknown): Score | null {
  const n = typeof value === "number" ? value : typeof value === "string" && /^[012]$/.test(value.trim()) ? Number(value.trim()) : NaN;
  return n === 0 || n === 1 || n === 2 ? n : null;
}

function checkText(raw: unknown, max: number): { text: string; error?: string } {
  const text = oneLine(typeof raw === "string" ? raw : "");
  if (!text) return { text, error: "กรุณากรอกข้อความ" };
  if (text.length > max) return { text, error: `ยาวเกินไป (ไม่เกิน ${max} ตัวอักษร)` };
  return { text };
}

// Anything that is not text counts as empty, so a damaged stored value can't break the page.
export function validateQuestionSet(input: unknown): QuestionSetResult {
  const errors: QuestionSetErrors = {};
  const source = (input && typeof input === "object" ? (input as { questions?: unknown }).questions : null) as unknown;
  if (!Array.isArray(source) || source.length !== QUESTION_COUNT) {
    return { ok: false, errors: { form: `ชุดคำถามต้องมี ${QUESTION_COUNT} ข้อ` } };
  }

  const rawCategories = (input && typeof input === "object" ? (input as { categories?: unknown }).categories : null) as unknown;
  if (!Array.isArray(rawCategories) || rawCategories.length !== 3) {
    return { ok: false, errors: { form: "ต้องมีหมวด 3 หมวด" } };
  }
  const categories = [0, 1, 2].map((i) => {
    const raw = (rawCategories[i] && typeof rawCategories[i] === "object" ? rawCategories[i] : {}) as { title?: unknown; name?: unknown };
    const title = checkText(raw.title, MAX_CATEGORY_TITLE_LENGTH);
    const name = checkText(raw.name, MAX_CATEGORY_NAME_LENGTH);
    if (title.error) errors[`c${i + 1}t`] = title.error;
    if (name.error) errors[`c${i + 1}n`] = name.error;
    return { title: title.text, name: name.text };
  }) as QuestionSetContent["categories"];

  const questions: QuestionDef[] = [];
  builtInQuestions.forEach((fixed, i) => {
    const n = i + 1;
    const raw = (source[i] && typeof source[i] === "object" ? source[i] : {}) as { question?: unknown; options?: unknown };
    const q = checkText(raw.question, MAX_QUESTION_LENGTH);
    if (q.error) errors[`q${n}`] = q.error;

    const rawOptions = Array.isArray(raw.options) ? raw.options : [];
    const options: AnswerDef[] = [];
    const scores: (Score | null)[] = [];
    for (let m = 0; m < 3; m++) {
      const rawOption = (rawOptions[m] && typeof rawOptions[m] === "object" ? rawOptions[m] : {}) as { text?: unknown; score?: unknown };
      const t = checkText(rawOption.text, MAX_ANSWER_LENGTH);
      if (t.error) errors[`q${n}a${m + 1}`] = t.error;
      const score = readScore(rawOption.score);
      if (score === null) errors[`q${n}a${m + 1}s`] = "กรุณาเลือกคะแนน 0, 1 หรือ 2";
      scores.push(score);
      options.push({ text: t.text, score: score ?? 0 });
    }

    // The three answers must score exactly 0, 1 and 2. Only checked when each score is valid on its own.
    if (scores.every((s) => s !== null) && new Set(scores).size !== 3) errors[`q${n}s`] = scoreRuleMessage;

    questions.push({ id: fixed.id, category: fixed.category, question: q.text, options: options as QuestionDef["options"] });
  });

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: { categories, questions } };
}

// The note that explains a change. Optional.
export function validateNote(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const text = oneLine(typeof raw === "string" ? raw : "");
  return text.length > MAX_NOTE_LENGTH
    ? { ok: false, error: `ยาวเกินไป (ไม่เกิน ${MAX_NOTE_LENGTH} ตัวอักษร)` }
    : { ok: true, value: text };
}

// A stored set is checked again when it is read, so a damaged row can never reach the quiz.
export function parseStoredSet(raw: unknown): QuestionSetContent | null {
  // A set saved before the category text could be edited has no categories: it used the built-in text.
  const withCategories =
    raw && typeof raw === "object" && !("categories" in raw) ? { ...(raw as object), categories: builtInCategories() } : raw;
  const result = validateQuestionSet(withCategories);
  return result.ok ? result.value : null;
}

export function sameSet(a: QuestionSetContent, b: QuestionSetContent): boolean {
  return JSON.stringify([a.categories, a.questions]) === JSON.stringify([b.categories, b.questions]);
}

// What the visitor gets: the texts only. The scores stay on the server.
export function publicQuestions(content: QuestionSetContent): Question[] {
  return content.questions.map((q) => ({
    id: q.id,
    category: q.category,
    categoryTitle: content.categories[q.category - 1].title,
    question: q.question,
    options: q.options.map((o) => o.text) as Question["options"],
  }));
}

// For the email and the code page: only what differs, one line per changed text or score.
export function diffQuestionSets(before: QuestionSetContent | null, after: QuestionSetContent): Change[] {
  const changes: Change[] = [];
  const same = (a: string, b: string) => a === b;
  after.categories.forEach((c, i) => {
    const old = before?.categories[i];
    if (!same(old?.title ?? "", c.title)) changes.push({ label: `หมวดที่ ${i + 1} – หัวข้อ`, before: old?.title ?? "(ไม่ทราบ)", after: c.title });
    if (!same(old?.name ?? "", c.name)) changes.push({ label: `หมวดที่ ${i + 1} – ชื่อสั้นในหน้าผลลัพธ์`, before: old?.name ?? "(ไม่ทราบ)", after: c.name });
  });
  after.questions.forEach((q, i) => {
    const old = before?.questions[i];
    if (!same(old?.question ?? "", q.question)) {
      changes.push({ label: `ข้อ ${q.id} – คำถาม`, before: old?.question ?? "(ไม่ทราบ)", after: q.question });
    }
    q.options.forEach((o, m) => {
      const oldOption = old?.options[m];
      if (!same(oldOption?.text ?? "", o.text)) {
        changes.push({ label: `ข้อ ${q.id} – คำตอบที่ ${m + 1} (ข้อความ)`, before: oldOption?.text ?? "(ไม่ทราบ)", after: o.text });
      }
      if (oldOption?.score !== o.score) {
        changes.push({ label: `ข้อ ${q.id} – คำตอบที่ ${m + 1} (คะแนน)`, before: String(oldOption?.score ?? "(ไม่ทราบ)"), after: String(o.score) });
      }
    });
  });
  return changes;
}

// A set as the edit form holds it, to fill the form from a saved version.
export function setToInput(content: QuestionSetContent): QuestionSetInput {
  return {
    categories: content.categories.map((c) => ({ title: c.title, name: c.name })),
    questions: content.questions.map((q) => ({
      question: q.question,
      options: q.options.map((o) => ({ text: o.text, score: String(o.score) })),
    })),
    note: "",
  };
}
