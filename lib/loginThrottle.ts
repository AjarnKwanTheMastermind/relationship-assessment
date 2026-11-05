import { envInt } from "./envNumber";

// Limits for wrong passwords at the backoffice login prompt. After maxAttempts wrong tries in a row (default 20: a page
// that loads several parts at once counts each part until the first one succeeds and clears the count) the login is
// refused for everyone, even with the right password, for lockMinutes. The same minutes are the window in which
// tries are counted. Kept apart from the limits on the settings forms (lib/passwordLock.ts).
export function loginRules() {
  return {
    maxAttempts: envInt("LOGIN_MAX_ATTEMPTS", 20, 1, 100),
    lockMinutes: envInt("LOGIN_LOCK_MINUTES", 15, 1, 1440),
  };
}
