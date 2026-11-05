import { secureEqual } from "./secureEqual";

// Checks an HTTP Basic "Authorization" header against the admin login (username "admin").
// Used by the middleware and again inside server actions that change data.
export function hasAdminAccess(header: string | null, password: string | undefined): boolean {
  if (!password || !header?.startsWith("Basic ")) return false;
  try {
    // Browsers send UTF-8, so non-English passwords need decoding from bytes.
    const bytes = Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0));
    const [user, ...rest] = new TextDecoder().decode(bytes).split(":");
    // Both parts are always compared, in constant time, so a wrong user name and a wrong password look alike.
    const userOk = secureEqual(user, "admin");
    const passwordOk = secureEqual(rest.join(":"), password);
    return userOk && passwordOk;
  } catch {
    return false;
  }
}
