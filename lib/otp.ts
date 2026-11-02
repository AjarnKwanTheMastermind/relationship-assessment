import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

// Rules for the one-time password that approves a settings change.
export const OTP_TTL_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
export const MAX_REQUESTS = 3;
export const REQUEST_WINDOW_MINUTES = 15;

export type ChallengeAction = "set_line_url" | "reset_line_url";

export const requestErrors: Record<string, string> = {
  noemail: "ยังไม่ได้ตั้งค่า ADMIN_EMAIL (อีเมลผู้ดูแล) จึงบันทึกการตั้งค่าไม่ได้",
  noprovider: "ยังไม่ได้ตั้งค่าบริการส่งอีเมล (RESEND_API_KEY และ EMAIL_FROM) จึงบันทึกการตั้งค่าไม่ได้",
  rate: `ขอรหัสบ่อยเกินไป (ไม่เกิน ${MAX_REQUESTS} ครั้งใน ${REQUEST_WINDOW_MINUTES} นาที) กรุณารอสักครู่แล้วลองใหม่`,
  send: "ส่งอีเมลไม่สำเร็จ การตั้งค่ายังไม่เปลี่ยน กรุณาลองใหม่อีกครั้ง",
};

export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// The code is bound to its challenge id and keyed with the admin password, so a copy of the
// database alone can't be used to work out a code, and a code can't be reused for another change.
export function hashCode(id: string, code: string): string {
  return createHmac("sha256", `otp:${process.env.ADMIN_PASSWORD ?? ""}`).update(`${id}:${code}`).digest("hex");
}

export function codeMatches(storedHash: string, id: string, code: string): boolean {
  const a = Buffer.from(storedHash, "hex");
  const b = Buffer.from(hashCode(id, code), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);

export function changeSummary(action: ChallengeAction, payload: string | null): string {
  return action === "reset_line_url"
    ? "คืนค่าลิงก์ LINE เป็นค่าเริ่มต้น"
    : `ตั้งลิงก์ LINE เป็น ${payload ?? ""}`;
}
