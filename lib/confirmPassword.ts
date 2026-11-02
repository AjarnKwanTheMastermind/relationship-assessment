import { createHash, timingSafeEqual } from "node:crypto";

// Compares the password typed on the settings form with ADMIN_PASSWORD. Both sides are hashed first
// so the comparison takes the same time whatever the input length.
export function passwordMatches(input: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(input), digest(expected));
}
