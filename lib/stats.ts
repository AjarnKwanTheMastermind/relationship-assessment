import { questions } from "./quiz";
import type { AnswerCount } from "./db";

export type OptionStat = { index: number; text: string; picks: number; percent: number };
export type QuestionStat = {
  id: number;
  categoryTitle: string;
  question: string;
  total: number;
  options: OptionStat[];
};

// Options nobody picked have no row in `counts`, so they are filled in here as zero.
export function buildQuestionStats(counts: AnswerCount[]): QuestionStat[] {
  return questions.map((q) => {
    const picksFor = (i: number) =>
      counts.find((c) => c.question_no === q.id && c.option_index === i)?.picks ?? 0;
    const total = q.options.reduce((sum, _, i) => sum + picksFor(i), 0);
    return {
      id: q.id,
      categoryTitle: q.categoryTitle,
      question: q.question,
      total,
      options: q.options.map((text, i) => ({
        index: i,
        text,
        picks: picksFor(i),
        percent: total === 0 ? 0 : (picksFor(i) / total) * 100,
      })),
    };
  });
}

export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

// Colour follows the option's severity, in the order red, yellow, green.
export const optionColors = ["#ef4444", "#d19a08", "#14a090"];
export const optionLevels = ["รุนแรง", "ปานกลาง", "ดี"];
