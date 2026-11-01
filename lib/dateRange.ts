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
export function parseDateRange(fromParam: unknown, toParam: unknown, today = todayInBangkok()): DateRange {
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
  if (daysBetween(from, to).length > MAX_RANGE_DAYS) {
    return { from, to, error: `เลือกช่วงวันที่ได้ไม่เกิน ${MAX_RANGE_DAYS} วัน` };
  }
  return { from, to, error: null };
}

export function daysBetween(from: string, to: string) {
  const days: string[] = [];
  for (let time = toTime(from); time <= toTime(to); time += DAY_MS) days.push(fromTime(time));
  return days;
}
