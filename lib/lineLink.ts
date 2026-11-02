// The LINE official account link: default, validation and the account name shown beside it.
// Pure functions, so client and server code can both import this file.

export const DEFAULT_LINE_URL = "https://line.me/ti/p/~@aj.kwan";
export const MAX_LINE_URL_LENGTH = 300;

export type LineUrlError = "required" | "length" | "format" | "https" | "host";

export const lineUrlErrors: Record<LineUrlError, string> = {
  required: "กรุณากรอกลิงก์",
  length: `ลิงก์ยาวเกินไป (ไม่เกิน ${MAX_LINE_URL_LENGTH} ตัวอักษร)`,
  format: "รูปแบบลิงก์ไม่ถูกต้อง",
  https: "ลิงก์ต้องขึ้นต้นด้วย https://",
  host: "ลิงก์ต้องเป็นของ LINE (line.me หรือ lin.ee)",
};

export type LineUrlResult = { ok: true; value: string } | { ok: false; error: LineUrlError };

// The link becomes an href on public pages, so only https links to LINE's own hosts are accepted.
export function validateLineUrl(input: string): LineUrlResult {
  const value = input.trim();
  if (!value) return { ok: false, error: "required" };
  if (value.length > MAX_LINE_URL_LENGTH) return { ok: false, error: "length" };
  if (/\s/.test(value)) return { ok: false, error: "format" };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: "format" };
  }
  if (url.protocol !== "https:") return { ok: false, error: "https" };

  const host = url.hostname.toLowerCase();
  const isLine = host === "line.me" || host.endsWith(".line.me") || host === "lin.ee";
  if (!isLine || url.username || url.password) return { ok: false, error: "host" };
  return { ok: true, value };
}

// "@aj.kwan" from https://line.me/ti/p/~@aj.kwan. Short links such as lin.ee carry no account name.
export function lineHandle(url: string): string | null {
  const match = /^https:\/\/line\.me\/(?:R\/)?ti\/p\/(?:~|%7E)?((?:@|%40)[\w.\-%]+)\/?(?:[?#].*)?$/i.exec(url.trim());
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function lineLabel(url: string): string {
  const handle = lineHandle(url);
  return handle ? `LINE: ${handle}` : "LINE Official";
}
