import { DEFAULT_LINE_URL, lineUrlErrors, type LineUrlError } from "@/lib/lineLink";
import MailNotice from "@/components/MailNotice";
import LineUrlInput from "@/components/LineUrlInput";
import LockNotice from "@/components/LockNotice";
import ScrollToTop from "@/components/ScrollToTop";
import TwoFactorStatus from "@/components/TwoFactorStatus";
import { getPasswordLock } from "@/lib/db";
import { lockedMessage, wrongPasswordMessage } from "@/lib/lockMessages";
import { otpErrors } from "@/lib/otpErrors";
import { readSettingsNow } from "@/lib/settings";
import { twoFactorOn } from "@/lib/twoFactor";
import { saveSettings } from "./actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-xl border border-brand-border bg-brand-black px-3 py-2 text-xs text-white focus:border-brand-pink focus:outline-none";

const savedMessages: Record<string, string> = {
  "1": "บันทึกแล้ว หน้าเว็บจะแสดงลิงก์ใหม่ทันทีหรือภายในไม่กี่นาที",
  reset: "คืนค่าเริ่มต้นแล้ว หน้าเว็บจะแสดงลิงก์เดิมทันทีหรือภายในไม่กี่นาที",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string; value?: string; mail?: string; left?: string; until?: string };
}) {
  const { settings } = await readSettingsNow();
  const twoFactor = twoFactorOn();
  // While saving is locked after too many wrong passwords, say so before anyone tries.
  const lockedUntil = twoFactor ? null : await getPasswordLock();

  const errorMessages: Record<string, string> = {
    ...lineUrlErrors,
    ...otpErrors,
    invalid: "คำขอไม่ถูกต้อง การตั้งค่ายังไม่เปลี่ยน",
    password: wrongPasswordMessage(searchParams.left === undefined ? undefined : Number(searchParams.left)),
    locked: lockedMessage(searchParams.until === undefined ? undefined : Number(searchParams.until)),
  };
  const errorKey = searchParams.error ?? "";
  const error = Object.prototype.hasOwnProperty.call(errorMessages, errorKey) ? errorMessages[errorKey] : null;

  const saved = Object.prototype.hasOwnProperty.call(savedMessages, searchParams.saved ?? "")
    ? savedMessages[searchParams.saved as string]
    : null;

  // After a rejected save, keep what the administrator typed so it can be corrected.
  const inputValue = error ? (searchParams.value ?? "") : settings.lineUrl;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-kanit text-2xl font-bold text-white">ติดต่อ</h1>
        <p className="text-xs font-light text-gray-400">แก้ไขช่องทางติดต่อที่แสดงบนหน้าเว็บ เช่น LINE Official Account ค่าที่บันทึกจะมีผลกับทุกหน้า</p>
      </div>

      {saved && (
        <>
          {/* A new key on every render, so the page scrolls up again after each successful save. */}
          <ScrollToTop key={Date.now()} />
          <p role="status" className="rounded-2xl border border-brand-pink/40 bg-brand-pink/10 p-4 text-sm text-brand-roseGold">
            {saved}
          </p>
        </>
      )}
      {saved && <MailNotice status={searchParams.mail} />}
      {searchParams.error !== "locked" && <LockNotice until={lockedUntil} />}
      {error && (
        <>
          {/* A new key on every render, so the page scrolls up again after each failed save. */}
          <ScrollToTop key={Date.now()} />
          <p role="alert" className="error-box">
            {error}
          </p>
        </>
      )}

      <form action={saveSettings} className="glass-card space-y-4 rounded-2xl p-4 sm:p-5">
        <div>
          <label htmlFor="lineUrl" className="mb-1 block text-sm font-medium text-white">
            ลิงก์ LINE Official Account
          </label>
          <p className="mb-2 text-xs font-light text-gray-400">
            แสดงที่มุมขวาบนของทุกหน้า และในปุ่มสมัครเรียนและปรึกษาของส่วนคอร์ส
          </p>
          <LineUrlInput defaultValue={inputValue} invalid={Boolean(error)} className={inputClass} />
          <p id="lineUrlHelp" className="mt-1 text-[11px] font-light text-gray-500">
            ต้องขึ้นต้นด้วย https:// และเป็นลิงก์ของ LINE (line.me หรือ lin.ee) ค่าเริ่มต้น: {DEFAULT_LINE_URL}
          </p>
        </div>

        {twoFactor ? (
          <p className="rounded-xl border border-brand-border px-3 py-2 text-xs font-light text-gray-300">
            เปิดใช้การยืนยันตัวตนสองขั้นตอน (2FA): หลังกดบันทึก ระบบจะส่งรหัส OTP ไปที่อีเมลผู้ดูแล และการตั้งค่าจะเปลี่ยนเมื่อกรอกรหัสถูกต้อง
          </p>
        ) : (
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-white">
            รหัสผ่านผู้ดูแล
          </label>
          <p className="mb-2 text-xs font-light text-gray-400">กรอกรหัสผ่านที่ใช้เข้า backoffice อีกครั้ง เพื่อยืนยันการเปลี่ยนแปลง</p>
          <input
            // A new key after every submit remounts the field, so the password never stays in the box.
            key={`${searchParams.saved ?? ""}:${searchParams.error ?? ""}:${Date.now()}`}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={searchParams.error === "password" ? true : undefined}
            className={inputClass}
          />
        </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="gradient-pink-btn rounded-xl px-5 py-2 text-xs font-semibold text-white">
            บันทึก
          </button>
          <button
            type="submit"
            name="intent"
            value="reset"
            formNoValidate
            className="rounded-xl border border-brand-border px-5 py-2 text-xs text-gray-300 hover:border-brand-pink hover:text-white"
          >
            คืนค่าเริ่มต้น
          </button>
        </div>
      </form>

      <TwoFactorStatus />
    </div>
  );
}
