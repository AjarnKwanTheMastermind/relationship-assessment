// One structured line per security event, written to the application log (Netlify: Logs > Functions).
// It never holds a password, a code, an address or a name: only what happened and a few counts.
export type SecurityEvent =
  | "login_failed"
  | "login_locked"
  | "password_failed"
  | "password_locked"
  | "otp_requested"
  | "otp_rate_limited"
  | "otp_wrong"
  | "otp_cancelled"
  | "change_applied"
  | "quiz_rate_limited";

export function securityLog(event: SecurityEvent, details: Record<string, string | number | boolean> = {}): void {
  console.warn(JSON.stringify({ security: event, at: new Date().toISOString(), ...details }));
}
