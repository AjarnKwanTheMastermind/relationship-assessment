import Link from "next/link";
import { getChallenge } from "@/lib/db";
import { adminEmail, maskEmail } from "@/lib/mailer";
import { MAX_ATTEMPTS, OTP_TTL_MINUTES, changeSummary, isUuid, requestErrors } from "@/lib/otp";
import { cancelChange, resendCode, verifyCode } from "../actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-40 rounded-xl border border-brand-border bg-brand-black px-3 py-2 text-center text-lg tracking-[0.4em] text-white focus:border-brand-pink focus:outline-none";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: { c?: string; error?: string; left?: string; sent?: string; dev?: string };
}) {
  const id = searchParams.c ?? "";
  const row = isUuid(id) ? await getChallenge(id) : null;

  let problem: string | null = null;
  if (!row) problem = "ไม่พบคำขอนี้";
  else if (row.consumed_at) problem = "คำขอนี้ถูกใช้ไปแล้ว ถูกยกเลิก หรือมีคำขอใหม่แทนที่";
  else if (row.expires_at.getTime() < Date.now()) problem = "รหัสหมดอายุแล้ว";
  else if (row.attempts >= MAX_ATTEMPTS) problem = "กรอกรหัสผิดเกินกำหนด";

  if (!row || problem) {
    return (
      <div className="space-y-4">
        <h1 className="font-kanit text-2xl font-bold text-white">ยืนยันรหัส OTP</h1>
        <p role="alert" className="rounded-2xl border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-300">
          {problem} การตั้งค่ายังไม่เปลี่ยน กรุณาเริ่มต้นใหม่จากหน้าตั้งค่า
        </p>
        <Link href="/backoffice/settings" className="gradient-pink-btn inline-block rounded-xl px-5 py-2 text-xs font-semibold text-white">
          กลับไปหน้าตั้งค่า
        </Link>
      </div>
    );
  }

  const email = adminEmail();
  const left = Number(searchParams.left);
  const errors: Record<string, string> = {
    format: "กรุณากรอกรหัส 6 หลัก",
    wrong: `รหัสไม่ถูกต้อง เหลืออีก ${Number.isInteger(left) ? left : "ไม่กี่"} ครั้ง`,
    locked: "กรอกรหัสผิดเกินกำหนด",
    ...requestErrors,
  };
  const error = Object.prototype.hasOwnProperty.call(errors, searchParams.error ?? "") ? errors[searchParams.error as string] : null;

  // Development only: nothing is emailed there, so the code is shown to make testing possible.
  const devCode = process.env.NODE_ENV === "development" && /^\d{6}$/.test(searchParams.dev ?? "") ? searchParams.dev : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-kanit text-2xl font-bold text-white">ยืนยันรหัส OTP</h1>
        <p className="text-xs font-light text-gray-400">
          {email ? `ส่งรหัส 6 หลักไปที่ ${maskEmail(email)} แล้ว` : "ส่งรหัส 6 หลักไปที่อีเมลผู้ดูแลแล้ว"} ใช้ได้ครั้งเดียวภายใน{" "}
          {OTP_TTL_MINUTES} นาที (หมดอายุ{" "}
          {row.expires_at.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })} น.)
        </p>
      </div>

      {searchParams.sent === "1" && (
        <p role="status" className="rounded-2xl border border-brand-pink/40 bg-brand-pink/10 p-4 text-sm text-brand-roseGold">
          ส่งรหัสใหม่แล้ว รหัสเดิมใช้ไม่ได้อีก
        </p>
      )}
      {devCode && (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 text-sm text-amber-200">
          โหมดพัฒนา: ไม่ได้ส่งอีเมลจริง รหัสคือ <strong className="tracking-widest">{devCode}</strong>
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-2xl border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-300">
          {error}
        </p>
      )}

      <section className="glass-card rounded-2xl p-4 text-xs text-gray-300 sm:p-5">
        <h2 className="mb-1 text-sm font-medium text-white">การเปลี่ยนแปลงที่รออนุมัติ</h2>
        <p className="break-all">{changeSummary(row.action, row.payload)}</p>
      </section>

      <form action={verifyCode} className="glass-card space-y-4 rounded-2xl p-4 sm:p-5">
        <input type="hidden" name="challenge" value={id} />
        {devCode && <input type="hidden" name="dev" value={devCode} />}
        <div>
          <label htmlFor="code" className="mb-2 block text-sm font-medium text-white">
            รหัส OTP
          </label>
          <input
            // A new key after every attempt empties the field and puts the cursor back in it.
            key={`${id}:${searchParams.error ?? ""}:${searchParams.left ?? ""}:${Date.now()}`}
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            aria-invalid={error ? true : undefined}
            className={inputClass}
          />
        </div>
        <button type="submit" className="gradient-pink-btn rounded-xl px-5 py-2 text-xs font-semibold text-white">
          ยืนยัน
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <form action={resendCode}>
          <input type="hidden" name="challenge" value={id} />
          <button type="submit" className="rounded-xl border border-brand-border px-5 py-2 text-xs text-gray-300 hover:border-brand-pink hover:text-white">
            ส่งรหัสใหม่
          </button>
        </form>
        <form action={cancelChange}>
          <input type="hidden" name="challenge" value={id} />
          <button type="submit" className="rounded-xl border border-brand-border px-5 py-2 text-xs text-gray-300 hover:border-brand-pink hover:text-white">
            ยกเลิกการเปลี่ยนแปลง
          </button>
        </form>
      </div>
    </div>
  );
}
