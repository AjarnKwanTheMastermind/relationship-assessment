// A whole number from an environment variable. A missing, empty, non-numeric or out-of-range value
// uses the default, so a typo can never switch a limit off or set it to something absurd.
export function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]?.trim();
  const value = Number(raw);
  return raw && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}
