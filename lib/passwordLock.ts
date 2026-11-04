import { envInt } from "./envNumber";

// Limits for the administrator password typed on the settings forms (used while TWO_FACTOR_AUTHEN is off).
// After maxAttempts tries in a row, saving is refused for lockMinutes. The same number of minutes is the
// window in which tries are counted, so a slow guesser is not tracked forever.
export function passwordRules() {
  return {
    maxAttempts: envInt("PASSWORD_MAX_ATTEMPTS", 5, 1, 20),
    lockMinutes: envInt("PASSWORD_LOCK_MINUTES", 15, 1, 1440),
  };
}
