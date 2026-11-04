import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { envInt } from "./envNumber";

// Rules for the one-time password that approves a settings change while two-factor authentication is on.
// Three limits can be changed with environment variables; a missing or invalid value uses the default.
const limit = envInt;

export function otpRules() {
  return {
    ttlMinutes: limit("OTP_TTL_MINUTES", 10, 1, 60),
    maxAttempts: limit("OTP_MAX_ATTEMPTS", 5, 1, 10),
    maxRequests: limit("OTP_MAX_REQUESTS", 3, 1, 20),
    windowMinutes: limit("OTP_REQUEST_WINDOW_MINUTES", 15, 1, 1440),
  };
}

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
