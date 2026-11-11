import Link from "next/link";
import TwoFactorStatus from "@/components/TwoFactorStatus";
import { readSettingsNow } from "@/lib/settings";

export const dynamic = "force-dynamic";

// The list of courses. Each course has its own edit page, which keeps this sub menu item highlighted.
export default async function CourseDetailsPage() {
  const { settings, courseUpdatedAt } = await readSettingsNow();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-kanit text-2xl font-bold text-white">รายละเอียดคอร์ส</h1>
        <p className="text-xs font-light text-gray-400">แก้ไขชื่อ ราคา และรายละเอียดของแต่ละคอร์สที่แสดงในหน้าผลลัพธ์</p>
      </div>

      <section className="glass-card rounded-2xl p-4 text-xs text-gray-300 sm:p-5">
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

      <TwoFactorStatus />
    </div>
  );
}
