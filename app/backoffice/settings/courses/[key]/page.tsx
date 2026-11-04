import Link from "next/link";
import { notFound } from "next/navigation";
import MailNotice from "@/components/MailNotice";
import CourseForm from "@/components/CourseForm";
import { courseToValues } from "@/lib/courseEdit";
import { courses } from "@/lib/courses";
import LockNotice from "@/components/LockNotice";
import { getPasswordLock } from "@/lib/db";
import { readSettingsNow } from "@/lib/settings";
import { twoFactorOn } from "@/lib/twoFactor";

export const dynamic = "force-dynamic";

const savedMessages: Record<string, string> = {
  "1": "บันทึกแล้ว หน้าผลลัพธ์จะแสดงข้อมูลใหม่ทันทีหรือภายในไม่กี่นาที",
  reset: "คืนค่าเริ่มต้นแล้ว (เขียนข้อมูลเริ่มต้นกลับลงฐานข้อมูล) หน้าผลลัพธ์จะแสดงข้อมูลเดิมทันทีหรือภายในไม่กี่นาที",
};

export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: { key: string };
  searchParams: { saved?: string; mail?: string };
}) {
  if (!courses.some((course) => course.key === params.key)) notFound();

  const { settings, courseUpdatedAt } = await readSettingsNow();
  const course = settings.courses.find((c) => c.key === params.key);
  if (!course) notFound();

  const saved = Object.prototype.hasOwnProperty.call(savedMessages, searchParams.saved ?? "")
    ? savedMessages[searchParams.saved as string]
    : null;
  const updatedAt = courseUpdatedAt[params.key];
  const twoFactor = twoFactorOn();
  // While saving is locked after too many wrong passwords, say so before anyone tries.
  const lockedUntil = twoFactor ? null : await getPasswordLock();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/backoffice/settings" className="text-xs text-gray-400 hover:text-white">
          ← กลับไปหน้าตั้งค่า
        </Link>
        <h1 className="mt-2 font-kanit text-2xl font-bold text-white">แก้ไขข้อมูลคอร์ส: {course.title}</h1>
        <p className="text-xs font-light text-gray-400">
          {updatedAt
            ? `บันทึกล่าสุด ${updatedAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`
            : "ยังไม่มีในฐานข้อมูล (ใช้ข้อมูลเริ่มต้น)"}{" "}
          ช่องที่มี * ต้องกรอก
        </p>
      </div>

      {saved && (
        <p role="status" className="rounded-2xl border border-brand-pink/40 bg-brand-pink/10 p-4 text-sm text-brand-roseGold">
          {saved}
        </p>
      )}

      {saved && <MailNotice status={searchParams.mail} />}

      <LockNotice until={lockedUntil} />

      <CourseForm
        key={`${params.key}:${updatedAt?.getTime() ?? 0}`}
        courseKey={params.key}
        initial={courseToValues(course)}
        twoFactor={twoFactor}
      />
    </div>
  );
}
