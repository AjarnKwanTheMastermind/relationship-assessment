// Two-factor authentication for settings changes is switched with the TWO_FACTOR_AUTHEN environment
// variable ("on"); anything else, or no value, leaves it off. It is deliberately not a setting in
// the app: someone who stole the backoffice password must not be able to switch it off.
export function twoFactorOn(value: string | undefined = process.env.TWO_FACTOR_AUTHEN): boolean {
  return ["on", "true", "1"].includes((value ?? "").trim().toLowerCase());
}
