export const DEFAULT_RANGE_DAYS = 30;
export const MAX_RANGE_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;

function toTime(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

function fromTime(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = toTime(value);
  // Rejects dates that don't exist, such as 2026-02-30.
  return !Number.isNaN(time) && fromTime(time) === value;
}

export function todayInBangkok(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
}

export type DateRange = { from: string; to: string; error: string | null };

// With no dates given, shows the latest 30 days. Bad input keeps what was typed and sets an error.
export function parseDateRange(fromParam: unknown, toParam: unknown, today = todayInBangkok(), maxDays = MAX_RANGE_DAYS): DateRange {
  if (!fromParam && !toParam) {
    return { from: fromTime(toTime(today) - (DEFAULT_RANGE_DAYS - 1) * DAY_MS), to: today, error: null };
  }

  const from = typeof fromParam === "string" ? fromParam : "";
  const to = typeof toParam === "string" ? toParam : "";
  if (!isValidDate(from) || !isValidDate(to)) {
    return { from, to, error: "กรุณาเลือกทั้งวันที่เริ่มต้นและวันที่สิ้นสุด" };
  }
  if (from > to) {
    return { from, to, error: "วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด" };
  }
  if (Number.isFinite(maxDays) && dayCount(from, to) > maxDays) {
    return { from, to, error: `เลือกช่วงวันที่ได้ไม่เกิน ${maxDays} วัน` };
  }
  return { from, to, error: null };
}

// The statistics page shows either everything (mode "all") or the days chosen (mode "range").
// In "all" mode, from and to hold a starting suggestion for the date boxes: the latest 30 days.
export type Period = { mode: "all" | "range"; from: string; to: string; error: string | null };

export function parsePeriod(periodParam: unknown, fromParam: unknown, toParam: unknown, today = todayInBangkok()): Period {
  const wantsRange = periodParam === "range" || (periodParam === undefined && Boolean(fromParam || toParam));
  if (!wantsRange) return { mode: "all", ...lastDays(DEFAULT_RANGE_DAYS, today), error: null };
  // Any length is fine here: nothing is drawn per day, so a long range costs no more than a short one.
  return { mode: "range", ...parseDateRange(fromParam, toParam, today, Infinity) };
}

// Keeps the chosen period when switching between the numbers and the pie charts.
export function periodQuery(period: Period): string {
  if (period.mode === "all" || period.error) return "";
  return `?period=range&from=${encodeURIComponent(period.from)}&to=${encodeURIComponent(period.to)}`;
}

// The latest N days, counting today, as a from and to date.
export function lastDays(days: number, today = todayInBangkok()) {
  return { from: fromTime(toTime(today) - (days - 1) * DAY_MS), to: today };
}

// How many days the range holds, worked out by arithmetic so a huge range costs nothing to check.
export function dayCount(from: string, to: string) {
  return Math.round((toTime(to) - toTime(from)) / DAY_MS) + 1;
}

// The list of days. Only call it for a range that already passed the length check.
export function daysBetween(from: string, to: string) {
  const days: string[] = [];
  for (let time = toTime(from); time <= toTime(to); time += DAY_MS) days.push(fromTime(time));
  return days;
}
