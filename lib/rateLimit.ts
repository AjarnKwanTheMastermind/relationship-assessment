// A small counter kept in the memory of one running copy of the app. Nothing is stored in the database, and the
// address is only used as a key for a minute, so it also fits the rule that no IP address is ever saved.
// Serverless hosts run several copies, so this slows a flood from one address without being exact; the
// total limit on the database side (RESPONSES_PER_MINUTE) is the backstop.
const windows = new Map<string, { start: number; count: number }>();
const WINDOW_MS = 60_000;

// True when this key may continue, false when it has used up its limit for the current minute.
export function withinLimit(key: string, limit: number, now = Date.now()): boolean {
  if (windows.size > 5_000) {
    for (const [k, w] of windows) if (now - w.start >= WINDOW_MS) windows.delete(k);
    // Still too many keys: start again rather than grow without bound.
    if (windows.size > 5_000) windows.clear();
  }
  const current = windows.get(key);
  if (!current || now - current.start >= WINDOW_MS) {
    windows.set(key, { start: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

// The caller's address as the host reports it. Netlify sets x-nf-client-connection-ip itself.
export function clientKey(headers: Headers): string {
  return (headers.get("x-nf-client-connection-ip") ?? headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim().slice(0, 64);
}
