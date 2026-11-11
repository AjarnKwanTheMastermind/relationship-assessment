import Link from "next/link";
import PeriodFilter from "@/components/PeriodFilter";
import type { Period } from "@/lib/dateRange";
import type { QuestionSetSummary } from "@/lib/db";
import { statsQuery } from "@/lib/stats";

// The heading, sub menu and period choice shared by the two views of the per-question statistics.
// A link is used for each view, so the choice is part of the address and no script is needed.
// The chosen period travels in the address, so it stays when the view is switched.
const views = [
  { id: "numbers", href: "/backoffice/report", label: "ตัวเลข" },
  { id: "pie", href: "/backoffice/charts", label: "Pie chart" },
] as const;

export type QuestionStatsView = (typeof views)[number]["id"];

const bangkokDate = (date: Date) => date.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" });

export default function QuestionStatsHeader({
  active,
  period,
  versions,
  version,
}: {
  active: QuestionStatsView;
  period: Period;
  // Every version of the questions (newest first) and the one the numbers are about.
  versions: QuestionSetSummary[];
  version: number;
}) {
  const current = views.find((view) => view.id === active)!;
  const latest = versions[0].version;
  const query = statsQuery(period, version, latest);
  const chosen = versions.find((v) => v.version === version) ?? versions[0];
  const options = versions.map((v) => ({
    version: v.version,
    label: `เวอร์ชัน ${v.version}${v.version === latest ? " (ล่าสุด)" : ""} · ${bangkokDate(v.createdAt)} · ${v.responses.toLocaleString("en-US")} คำตอบ`,
  }));

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-kanit text-2xl font-bold text-white">สถิติรายข้อ</h1>
        <p className="text-xs font-light text-gray-400">
          {active === "numbers"
            ? "จำนวนครั้งที่เลือกแต่ละคำตอบ และคิดเป็นร้อยละของผู้ตอบข้อนั้น"
            : "สัดส่วนคำตอบของแต่ละข้อ แสดงเป็นแผนภูมิวงกลม"}
        </p>
      </div>

      <nav aria-label="มุมมองสถิติรายข้อ" className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-400">แสดงแบบ:</span>
        {views.map(({ id, href, label }) => (
          <Link
            key={id}
            href={`${href}${query}`}
            aria-current={id === active ? "page" : undefined}
            className={`rounded-xl border px-4 py-1 ${
              id === active
                ? "border-brand-pink bg-brand-pink/10 font-semibold text-white"
                : "border-brand-border text-gray-300 hover:border-brand-pink hover:text-white"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <PeriodFilter action={current.href} mode={period.mode} from={period.from} to={period.to} error={period.error} versions={options} version={version} />

      <p className="text-xs text-gray-400">
        ชุดคำถาม:{" "}
        <span className="text-gray-200">
          เวอร์ชัน {chosen.version}
          {chosen.version === latest ? " (ล่าสุด)" : ""} บันทึกเมื่อ {bangkokDate(chosen.createdAt)}
          {chosen.note ? ` · ${chosen.note}` : ""}
        </span>
      </p>

      {!period.error && (
        <p className="text-xs text-gray-400">
          กำลังแสดง:{" "}
          <span className="text-gray-200">
            {period.mode === "all" ? "ข้อมูลทั้งหมด (all time)" : `เฉพาะวันที่ ${period.from} ถึง ${period.to} ตามเวลาประเทศไทย`}
          </span>
        </p>
      )}
    </div>
  );
}
