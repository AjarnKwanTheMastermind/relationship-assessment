import { DEFAULT_LINE_URL, MAX_LINE_URL_LENGTH, lineLabel, lineUrlErrors, type LineUrlError } from "@/lib/lineLink";
import { adminEmail, deliveryMode, maskEmail } from "@/lib/mailer";
import { OTP_TTL_MINUTES, requestErrors } from "@/lib/otp";
import { readSettingsNow } from "@/lib/settings";
import { requestChange } from "./actions";

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
  searchParams: { saved?: string; error?: string; value?: string };
}) {
  const { settings, updatedAt } = await readSettingsNow();

  const errorMessages: Record<string, string> = { ...lineUrlErrors, ...requestErrors };
  const errorKey = searchParams.error ?? "";
  const error = Object.prototype.hasOwnProperty.call(errorMessages, errorKey) ? errorMessages[errorKey] : null;

  const email = adminEmail();
  const mode = deliveryMode();
  const emailProblem = !email ? requestErrors.noemail : mode === "unavailable" ? requestErrors.noprovider : null;
  const saved = Object.prototype.hasOwnProperty.call(savedMessages, searchParams.saved ?? "")
    ? savedMessages[searchParams.saved as string]
    : null;

  // After a rejected save, keep what the administrator typed so it can be corrected.
  const inputValue = error ? (searchParams.value ?? "") : settings.lineUrl;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-kanit text-2xl font-bold text-white">ตั้งค่าระบบ</h1>
        <p className="text-xs font-light text-gray-400">แก้ไขข้อมูลที่แสดงบนหน้าเว็บ ค่าที่บันทึกจะมีผลกับทุกหน้า</p>
      </div>

      {saved && (
        <p role="status" className="rounded-2xl border border-brand-pink/40 bg-brand-pink/10 p-4 text-sm text-brand-roseGold">
          {saved}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-2xl border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-300">
          {error}
        </p>
      )}

      <section className="glass-card rounded-2xl p-4 text-xs text-gray-300 sm:p-5">
        <h2 className="mb-1 text-sm font-medium text-white">ยืนยันด้วยรหัส OTP</h2>
        {emailProblem ? (
          <p role="alert" className="text-red-300">
            {emailProblem}
          </p>
        ) : (
          <p>
            เมื่อกดบันทึกหรือคืนค่าเริ่มต้น ระบบจะส่งรหัส OTP 6 หลักไปที่อีเมลผู้ดูแล ({maskEmail(email as string)}) การเปลี่ยนแปลงจะมีผลเมื่อกรอก
            รหัสถูกต้องภายใน {OTP_TTL_MINUTES} นาที
            {mode === "console" && " (โหมดพัฒนา: ไม่ส่งอีเมลจริง รหัสจะแสดงในหน้ายืนยัน)"}
          </p>
        )}
        <p className="mt-1 text-[11px] font-light text-gray-500">
          อีเมลผู้ดูแลตั้งได้เฉพาะในตัวแปร ADMIN_EMAIL ของระบบ ไม่ได้แก้ไขจากหน้านี้ เพื่อไม่ให้ผู้ที่ได้รหัสผ่าน backoffice ไปเปลี่ยนที่อยู่รับรหัสได้
        </p>
      </section>

      <form action={requestChange} className="glass-card space-y-4 rounded-2xl p-4 sm:p-5">
        <div>
          <label htmlFor="lineUrl" className="mb-1 block text-sm font-medium text-white">
            ลิงก์ LINE Official Account
          </label>
          <p className="mb-2 text-xs font-light text-gray-400">
            แสดงที่มุมขวาบนของทุกหน้า และในปุ่มสมัครเรียนและปรึกษาของส่วนคอร์ส
          </p>
          <input
            id="lineUrl"
            name="lineUrl"
            type="url"
            required
            maxLength={MAX_LINE_URL_LENGTH}
            defaultValue={inputValue}
            aria-invalid={error ? true : undefined}
            aria-describedby="lineUrlHelp"
            className={inputClass}
          />
          <p id="lineUrlHelp" className="mt-1 text-[11px] font-light text-gray-500">
            ต้องขึ้นต้นด้วย https:// และเป็นลิงก์ของ LINE (line.me หรือ lin.ee) ค่าเริ่มต้น: {DEFAULT_LINE_URL}
          </p>
        </div>

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

      <section className="glass-card rounded-2xl p-4 text-xs text-gray-300 sm:p-5">
        <h2 className="mb-2 text-sm font-medium text-white">ค่าที่ใช้อยู่ตอนนี้</h2>
        <dl className="space-y-1">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-gray-400">ลิงก์:</dt>
            <dd className="break-all">{settings.lineUrl}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-gray-400">ข้อความที่แสดง:</dt>
            <dd>{lineLabel(settings.lineUrl)}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-gray-400">แก้ไขล่าสุด:</dt>
            <dd>
              {updatedAt
                ? updatedAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
                : "ยังไม่เคยแก้ไข (ใช้ค่าเริ่มต้น)"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
