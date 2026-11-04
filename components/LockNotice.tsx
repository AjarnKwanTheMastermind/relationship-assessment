import { lockedMessage } from "@/lib/lockMessages";

// Shown on the settings pages while saving is locked after too many wrong passwords.
export default function LockNotice({ until }: { until: Date | null }) {
  if (!until) return null;
  return (
    <p role="alert" className="rounded-2xl border border-yellow-500/40 bg-yellow-950/20 p-4 text-sm text-yellow-200">
      {lockedMessage(until.getTime())}
    </p>
  );
}
