import type { AnswerCount } from "./db";
import { periodQuery, type Period } from "./dateRange";
import type { QuestionSetContent, Score } from "./questionSet";

// score is the answer's score in this version of the questions; the colour and the level follow it, not the position.
export type OptionStat = { index: number; text: string; score: Score; picks: number; percent: number };
export type QuestionStat = {
  id: number;
  categoryTitle: string;
  question: string;
  total: number;
  options: OptionStat[];
};

// Options nobody picked have no row in `counts`, so they are filled in here as zero. The counts must come from
// responses answered against this same set, because a position means a different answer in another version.
export function buildQuestionStats(counts: AnswerCount[], set: QuestionSetContent): QuestionStat[] {
  return set.questions.map((q) => {
    const picksFor = (i: number) =>
      counts.find((c) => c.question_no === q.id && c.option_index === i)?.picks ?? 0;
    const total = q.options.reduce((sum, _, i) => sum + picksFor(i), 0);
    return {
      id: q.id,
      categoryTitle: set.categories[q.category - 1].title,
      question: q.question,
      total,
      options: q.options.map(({ text, score }, i) => ({
        index: i,
        text,
        score,
        picks: picksFor(i),
        percent: total === 0 ? 0 : (picksFor(i) / total) * 100,
      })),
    };
  });
}

export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

// Which version of the questions the statistics are about: the one in the address, else the newest.
export function parseVersion(param: unknown, available: number[]): number {
  const raw = Array.isArray(param) ? param[0] : param;
  const wanted = typeof raw === "string" && /^\d{1,9}$/.test(raw) ? Number(raw) : NaN;
  return available.includes(wanted) ? wanted : Math.max(...available);
}

// The address query that keeps the chosen period and version when the view is switched. The newest version is
// the default, so it is left out and a link keeps following the newest.
export function statsQuery(period: Period, version: number, latest: number): string {
  const params = new URLSearchParams(periodQuery(period).replace(/^\?/, ""));
  if (version !== latest) params.set("version", String(version));
  const query = params.toString();
  return query ? `?${query}` : "";
}

// Colour follows the answer's score: 0 red, 1 yellow, 2 green.
export const optionColors = ["#ef4444", "#d19a08", "#14a090"];
export const optionLevels = ["รุนแรง", "ปานกลาง", "ดี"];
