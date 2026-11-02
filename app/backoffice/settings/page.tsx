import Link from "next/link";
import { DEFAULT_LINE_URL, MAX_LINE_URL_LENGTH, lineLabel, lineUrlErrors, type LineUrlError } from "@/lib/lineLink";
import { readSettingsNow } from "@/lib/settings";
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
  searchParams: { saved?: string; error?: string; value?: string };
}) {
  const { settings, updatedAt, courseUpdatedAt } = await readSettingsNow();

  const errorMessages: Record<string, string> = {
    ...lineUrlErrors,
    password: "รหัสผ่านผู้ดูแลไม่ถูกต้อง การตั้งค่ายังไม่เปลี่ยน",
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

      <form action={saveSettings} className="glass-card space-y-4 rounded-2xl p-4 sm:p-5">
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
        <h2 className="mb-1 text-sm font-medium text-white">ข้อมูลคอร์ส</h2>
        <p className="mb-3 font-light text-gray-400">แก้ไขชื่อ ราคา และรายละเอียดของแต่ละคอร์สที่แสดงในหน้าผลลัพธ์</p>
        <ul className="space-y-2">
          {settings.courses.map((course) => (
            <li key={course.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-border px-3 py-2">
              <span>
                <span className="text-white">{course.title}</span>{" "}
                <span className="text-gray-500">
                  {courseUpdatedAt[course.key]
                    ? `· บันทึกล่าสุด ${courseUpdatedAt[course.key]?.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`
                    : "· ยังไม่มีในฐานข้อมูล (ใช้ข้อมูลเริ่มต้น)"}
                </span>
              </span>
              <Link
                href={`/backoffice/settings/courses/${course.key}`}
                className="rounded-xl border border-brand-border px-4 py-1 text-gray-300 hover:border-brand-pink hover:text-white"
              >
                แก้ไข
              </Link>
            </li>
          ))}
        </ul>
      </section>

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
