"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { lockedMessage, wrongPasswordMessage } from "@/lib/lockMessages";
import { otpErrors } from "@/lib/otpErrors";
import {
  MAX_ANSWER_LENGTH,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_CATEGORY_TITLE_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_QUESTION_LENGTH,
  QUESTION_COUNT,
  scoreLabels,
  scoreRuleMessage,
  validateNote,
  validateQuestionSet,
  type QuestionSetErrors,
  type QuestionSetInput,
  type Score,
} from "@/lib/questionSet";
import { builtInQuestions } from "@/lib/builtInQuestions";
import { saveQuestions, type QuestionFormState } from "@/app/backoffice/settings/questions/actions";

const inputClass =
  "w-full rounded-xl border border-brand-border bg-brand-black px-3 py-2 text-xs text-white focus:border-brand-pink focus:outline-none";
const alertClass = "error-box";

const CATEGORIES = [1, 2, 3] as const;

// Which questions each category holds (fixed): for the tab label "ข้อ 1–3".
const ranges = CATEGORIES.map((c) => {
  const ids = builtInQuestions.filter((q) => q.category === c).map((q) => q.id);
  return `${Math.min(...ids)}–${Math.max(...ids)}`;
});

// The category a field belongs to, from its name: "c2t" and "c2n" are category 2, "q5a1s" is question 5's category.
function categoryOfKey(key: string): number | null {
  const c = /^c([123])[tn]$/.exec(key);
  if (c) return Number(c[1]);
  const q = /^q(\d+)/.exec(key);
  return q ? (builtInQuestions[Number(q[1]) - 1]?.category ?? null) : null;
}

function errorCounts(errors: QuestionSetErrors): number[] {
  const counts = [0, 0, 0];
  for (const key of Object.keys(errors)) {
    const category = categoryOfKey(key);
    if (category) counts[category - 1] += 1;
  }
  return counts;
}

// How much of each category differs from the version the form started from: changed questions, plus 1 when the
// category's own text changed.
function editedCounts(now: QuestionSetInput, start: QuestionSetInput): number[] {
  const counts = [0, 0, 0];
  builtInQuestions.forEach((fixed, i) => {
    const a = now.questions[i];
    const b = start.questions[i];
    const changed =
      a.question !== b.question || a.options.some((o, m) => o.text !== b.options[m]?.text || o.score !== b.options[m]?.score);
    if (changed) counts[fixed.category - 1] += 1;
  });
  CATEGORIES.forEach((c) => {
    if (now.categories[c - 1].title !== start.categories[c - 1].title || now.categories[c - 1].name !== start.categories[c - 1].name) {
      counts[c - 1] += 1;
    }
  });
  return counts;
}

// The edit form for the questions and answers, in three tabs (one per category). All three tabs are one form: moving
// between tabs loses nothing, and one press of Save creates one new version with everything that was changed. The
// rules are the same ones the server applies (lib/questionSet.ts), so a mistake shows at once and nothing is sent.
// The server checks again, always.
export default function QuestionsForm({
  initial,
  twoFactor,
  initialTab = 1,
}: {
  initial: QuestionSetInput;
  twoFactor: boolean;
  initialTab?: number;
}) {
  const [state, setState] = useState<QuestionFormState>({ errors: {}, values: initial });
  // A new key after every submit remounts the fields, so the password never stays in the box.
  const [round, setRound] = useState(0);
  const [pending, startTransition] = useTransition();
  // Until the page is ready the button stays off, so a form can never be sent the plain browser way.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const [tab, setTab] = useState<number>(CATEGORIES.includes(initialTab as 1 | 2 | 3) ? initialTab : 1);
  const [edited, setEdited] = useState<number[]>([0, 0, 0]);
  const formRef = useRef<HTMLFormElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const saving = useRef(false);

  function selectTab(next: number, focus = false) {
    setTab(next);
    // The address keeps the tab, so a reload or a shared link returns to the same category.
    const url = new URL(window.location.href);
    url.searchParams.set("tab", String(next));
    window.history.replaceState(null, "", url);
    if (focus) tabRefs.current[next - 1]?.focus();
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    const target = event.key === "ArrowRight" ? (current % 3) + 1 : event.key === "ArrowLeft" ? ((current + 1) % 3) + 1 : event.key === "Home" ? 1 : event.key === "End" ? 3 : null;
    if (target === null) return;
    event.preventDefault();
    selectTab(target, true);
  }

  function readValues(formData: FormData): QuestionSetInput {
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

  function recount() {
    if (formRef.current) setEdited(editedCounts(readValues(new FormData(formRef.current)), initial));
  }

  // Every failed save counts up `round`. The page then goes to the first tab that has a mistake and scrolls to the top,
  // where the message is. The fields are remounted with what was typed, so the edited counts are worked out again.
  useEffect(() => {
    if (round === 0) return;
    const firstBad = errorCounts(state.errors).findIndex((n) => n > 0);
    if (firstBad >= 0) selectTab(firstBad + 1);
    window.scrollTo(0, 0);
    recount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Leaving or reloading with unsaved edits asks first. A save in progress does not.
  const dirty = edited.some((n) => n > 0);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (saving.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function submit(formData: FormData) {
    const typed = readValues(formData);
    const set = validateQuestionSet(typed);
    const note = validateNote(typed.note);
    if (!set.ok || !note.ok) {
      setState({ errors: { ...(set.ok ? {} : set.errors), ...(note.ok ? {} : { note: note.error }) }, values: typed });
      setRound((n) => n + 1);
      return;
    }
    saving.current = true;
    startTransition(async () => {
      const result = await saveQuestions(formData);
      // A saved version redirects; only a mistake comes back here.
      if (result) {
        saving.current = false;
        setState(result);
        setRound((n) => n + 1);
      }
    });
  }

  const { errors, message, values } = state;
  const counts = errorCounts(errors);
  const badTabs = CATEGORIES.filter((c) => counts[c - 1] > 0);

  return (
    <form
      ref={formRef}
      method="post"
      onInput={recount}
      onChange={recount}
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
      className="space-y-4"
    >
      {message === "password" && <p role="alert" className={alertClass}>{wrongPasswordMessage(state.left)}</p>}
      {message === "unchanged" && (
        <p role="alert" className={alertClass}>ไม่มีอะไรเปลี่ยนจากเวอร์ชันล่าสุด จึงไม่ได้สร้างเวอร์ชันใหม่</p>
      )}
      {message && message !== "password" && message !== "unchanged" && (
        <p role="alert" className={alertClass}>{message === "locked" ? lockedMessage(state.until) : otpErrors[message]}</p>
      )}
      {Object.keys(errors).length > 0 && (
        <p role="alert" className={alertClass}>
          <span>
            บันทึกไม่ได้ กรุณาแก้ไขช่องที่มีข้อความสีแดง
            {badTabs.length > 0 && ` (${badTabs.map((c) => `หมวดที่ ${c}: ${counts[c - 1]} จุด`).join(", ")})`}
            {errors.note ? " และช่องหมายเหตุ" : ""}
          </span>
        </p>
      )}

      <div role="tablist" aria-label="หมวดของคำถาม" className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = tab === c;
          return (
            <button
              key={c}
              ref={(el) => {
                tabRefs.current[c - 1] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${c}`}
              aria-selected={active}
              aria-controls={`panel-${c}`}
              tabIndex={active ? 0 : -1}
              onClick={() => selectTab(c)}
              onKeyDown={(event) => onTabKeyDown(event, c)}
              className={`flex flex-col items-start rounded-xl border px-4 py-2 text-left text-xs ${
                active
                  ? "border-brand-pink bg-brand-pink/10 font-semibold text-white"
                  : "border-brand-border text-gray-300 hover:border-brand-pink hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                หมวดที่ {c} · ข้อ {ranges[c - 1]}
                {counts[c - 1] > 0 && (
                  <span
                    aria-label={`มีข้อผิดพลาด ${counts[c - 1]} จุด`}
                    className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white"
                  >
                    {counts[c - 1]}
                  </span>
                )}
              </span>
              <span className="mt-0.5 text-[11px] font-light text-gray-400">
                {values.categories[c - 1]?.name || "(ยังไม่มีชื่อ)"}
                {edited[c - 1] > 0 && <span className="ml-2 text-brand-roseGold">แก้ไขแล้ว {edited[c - 1]}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {CATEGORIES.map((c) => (
        <div key={c} role="tabpanel" id={`panel-${c}`} aria-labelledby={`tab-${c}`} hidden={tab !== c} className="space-y-4">
          <section key={`${c}:${round}`} className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-medium text-white">ข้อความของหมวดที่ {c}</h2>
              <p className="text-xs font-light text-gray-400">
                หัวข้อแสดงเหนือคำถามของหมวดนี้ในแบบประเมิน ส่วนชื่อสั้นแสดงในหน้าผลลัพธ์ ข้อไหนอยู่หมวดไหนเปลี่ยนไม่ได้
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
              <div>
                <label htmlFor={`c${c}t`} className="mb-1 block text-xs font-medium text-gray-300">
                  หัวข้อเหนือคำถาม
                </label>
                <input
                  id={`c${c}t`}
                  name={`c${c}t`}
                  type="text"
                  defaultValue={values.categories[c - 1]?.title ?? ""}
                  maxLength={MAX_CATEGORY_TITLE_LENGTH * 2}
                  aria-invalid={errors[`c${c}t`] ? true : undefined}
                  className={inputClass}
                />
                {errors[`c${c}t`] && <p className="error-text">{errors[`c${c}t`]}</p>}
              </div>
              <div>
                <label htmlFor={`c${c}n`} className="mb-1 block text-xs font-medium text-gray-300">
                  ชื่อสั้นในหน้าผลลัพธ์
                </label>
                <input
                  id={`c${c}n`}
                  name={`c${c}n`}
                  type="text"
                  defaultValue={values.categories[c - 1]?.name ?? ""}
                  maxLength={MAX_CATEGORY_NAME_LENGTH * 2}
                  aria-invalid={errors[`c${c}n`] ? true : undefined}
                  className={inputClass}
                />
                {errors[`c${c}n`] && <p className="error-text">{errors[`c${c}n`]}</p>}
              </div>
            </div>
          </section>

          {builtInQuestions
            .filter((fixed) => fixed.category === c)
            .map((fixed) => {
              const n = fixed.id;
              const current = values.questions[n - 1];
              return (
                <section key={`${n}:${round}`} className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
                  <div>
                    <label htmlFor={`q${n}`} className="mb-1 block text-sm font-medium text-white">
                      ข้อ {n}: คำถาม
                    </label>
                    <textarea
                      id={`q${n}`}
                      name={`q${n}`}
                      rows={3}
                      defaultValue={current.question}
                      maxLength={MAX_QUESTION_LENGTH * 2}
                      aria-invalid={errors[`q${n}`] ? true : undefined}
                      className={inputClass}
                    />
                    {errors[`q${n}`] && <p className="error-text">{errors[`q${n}`]}</p>}
                  </div>

                  <div className="space-y-3">
                    {[1, 2, 3].map((m) => {
                      const option = current.options[m - 1];
                      return (
                        <div key={m} className="grid gap-2 sm:grid-cols-[1fr_11rem]">
                          <div>
                            <label htmlFor={`q${n}a${m}`} className="mb-1 block text-xs font-medium text-gray-300">
                              คำตอบที่ {m}
                            </label>
                            <textarea
                              id={`q${n}a${m}`}
                              name={`q${n}a${m}`}
                              rows={2}
                              defaultValue={option?.text ?? ""}
                              maxLength={MAX_ANSWER_LENGTH * 2}
                              aria-invalid={errors[`q${n}a${m}`] ? true : undefined}
                              className={inputClass}
                            />
                            {errors[`q${n}a${m}`] && <p className="error-text">{errors[`q${n}a${m}`]}</p>}
                          </div>
                          <div>
                            <label htmlFor={`q${n}s${m}`} className="mb-1 block text-xs font-medium text-gray-300">
                              คะแนน
                            </label>
                            <select
                              id={`q${n}s${m}`}
                              name={`q${n}s${m}`}
                              defaultValue={option?.score ?? ""}
                              aria-invalid={errors[`q${n}a${m}s`] || errors[`q${n}s`] ? true : undefined}
                              className={inputClass}
                            >
                              <option value="">เลือกคะแนน</option>
                              {([0, 1, 2] as Score[]).map((score) => (
                                <option key={score} value={score}>
                                  {scoreLabels[score]}
                                </option>
                              ))}
                            </select>
                            {errors[`q${n}a${m}s`] && <p className="error-text">{errors[`q${n}a${m}s`]}</p>}
                          </div>
                        </div>
                      );
                    })}
                    <p className={errors[`q${n}s`] ? "error-text" : "text-[11px] font-light text-gray-500"}>
                      {errors[`q${n}s`] ?? scoreRuleMessage}
                    </p>
                  </div>
                </section>
              );
            })}
        </div>
      ))}

      <section className="glass-card space-y-4 rounded-2xl p-4 sm:p-5">
        <p className="text-xs font-light text-gray-400">
          กดบันทึกครั้งเดียว ระบบจะบันทึกทุกหมวดที่แก้ไขไว้พร้อมกันเป็นเวอร์ชันใหม่ 1 เวอร์ชัน
          {dirty ? ` (แก้ไขแล้ว: ${CATEGORIES.map((c) => `หมวด ${c} = ${edited[c - 1]}`).join(", ")})` : ""}
        </p>

        <div>
          <label htmlFor="note" className="mb-1 block text-sm font-medium text-white">
            หมายเหตุการแก้ไข (ไม่บังคับ)
          </label>
          <p className="mb-2 text-xs font-light text-gray-400">บอกสั้นๆ ว่าแก้อะไรหรือเพราะอะไร จะเก็บไว้กับเวอร์ชันนี้</p>
          <input
            key={`note:${round}`}
            id="note"
            name="note"
            type="text"
            defaultValue={values.note}
            maxLength={MAX_NOTE_LENGTH * 2}
            aria-invalid={errors.note ? true : undefined}
            className={inputClass}
          />
          {errors.note && <p className="error-text">{errors.note}</p>}
        </div>

        {twoFactor ? (
          <p className="rounded-xl border border-brand-border px-3 py-2 text-xs font-light text-gray-300">
            เปิดใช้การยืนยันตัวตนสองขั้นตอน (2FA): หลังกดบันทึก ระบบจะส่งรหัส OTP ไปที่อีเมลผู้ดูแล และชุดคำถามใหม่จะเริ่มใช้เมื่อกรอกรหัสถูกต้อง
          </p>
        ) : (
          <div>
            <label htmlFor="questions-password" className="mb-1 block text-sm font-medium text-white">
              รหัสผ่านผู้ดูแล
            </label>
            <p className="mb-2 text-xs font-light text-gray-400">กรอกรหัสผ่านที่ใช้เข้า backoffice อีกครั้ง เพื่อยืนยันการเปลี่ยนแปลง</p>
            <input
              key={`password:${round}`}
              id="questions-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={message === "password" ? true : undefined}
              className={inputClass}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={pending || !ready}
          className="gradient-pink-btn rounded-xl px-5 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {pending ? "กำลังบันทึก..." : "บันทึกเป็นเวอร์ชันใหม่"}
        </button>
      </section>
    </form>
  );
}
