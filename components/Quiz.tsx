"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScrollToTop from "./ScrollToTop";
import Spinner from "./Spinner";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { Question } from "@/lib/builtInQuestions";

// The questions come from the server as a prop: the version tells which saved set they are, and is sent back with the answers.
export default function Quiz({ version, questions }: { version: number; questions: Question[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  // Counts failed sends, so the page scrolls up again when the same error repeats.
  const [failures, setFailures] = useState(0);

  const q = questions[index];
  const selected = answers[index];
  const isLast = index === questions.length - 1;

  function select(optionIndex: number) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? optionIndex : a)));
  }

  async function next() {
    if (selected === null) return;
    if (!isLast) {
      setIndex(index + 1);
      return;
    }

    setSubmitting(true);
    setError(false);
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, version }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { id } = await res.json();
      // Starts the bar across the top; the result page is read and scored while it runs.
      window.dispatchEvent(new Event("nav-start"));
      router.push(`/results/${id}`);
    } catch {
      setError(true);
      setFailures((n) => n + 1);
      setSubmitting(false);
    }
  }

  return (
    <div className="glass-card box-glow rounded-3xl border border-brand-pink/20 p-5 sm:p-8">
      {error && (
        <>
          {/* At the top of the card, with the page scrolled up to it, so it is seen after pressing the last button. */}
          <ScrollToTop key={failures} />
          <p role="alert" className="error-box mb-4">
            ไม่สามารถส่งคำตอบได้ กรุณาลองใหม่อีกครั้ง
          </p>
        </>
      )}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="rounded-full border border-brand-pink/40 bg-brand-pink/20 px-3 py-1 font-semibold text-brand-pink">
            {q.categoryTitle}
          </span>
          <span className="shrink-0 text-gray-400">
            ข้อที่ <span className="font-bold text-brand-pink">{index + 1}</span> / {questions.length}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full border border-brand-border bg-brand-black">
          <div
            className="h-full bg-gradient-to-r from-brand-pink to-brand-roseGold transition-all duration-300"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex min-h-[260px] flex-col justify-between">
        <div>
          <h1 className="mb-5 font-kanit text-lg font-medium leading-relaxed text-white sm:text-xl">{q.question}</h1>
          <div className="space-y-3">
            {q.options.map((text, i) => {
              const isSelected = selected === i;
              return (
                <button
                  key={text}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => select(i)}
                  className={`option-card flex w-full cursor-pointer items-start space-x-3 rounded-2xl border border-brand-border bg-brand-black/70 p-4 text-left text-xs sm:text-sm ${
                    isSelected ? "selected font-semibold text-brand-pink" : "text-gray-300"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand-border ${
                      isSelected ? "border-brand-pink bg-brand-pink text-white" : "bg-brand-black"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="leading-relaxed">{text}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-brand-border/60 pt-4">
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className={`flex items-center space-x-2 rounded-xl border border-brand-border px-4 py-2.5 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-white sm:text-sm ${
              index === 0 ? "invisible" : ""
            }`}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>ย้อนกลับ</span>
          </button>

          <span className="hidden text-xs text-gray-500 sm:inline">เลือกตอบตามสถานการณ์จริงที่คุณเผชิญอยู่</span>

          <button
            type="button"
            onClick={next}
            disabled={selected === null || submitting}
            className="gradient-pink-btn flex items-center space-x-2 rounded-xl px-6 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            {submitting && <Spinner />}
            <span>{submitting ? "กำลังประมวลผล..." : isLast ? "ดูผลการประเมิน" : "ข้อถัดไป"}</span>
            {!submitting && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
