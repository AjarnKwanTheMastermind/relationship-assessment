// Compares two strings in time that does not depend on where they first differ. It works in the Edge
// runtime too (no Node modules), and both sides are padded to the longer length. Lengths still show
// through, which is fine here: a password's length is not what protects it.
export function secureEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  const length = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < length; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
