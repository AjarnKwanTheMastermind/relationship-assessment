import Link from "next/link";
import PeriodFilter from "@/components/PeriodFilter";
import { periodQuery, type Period } from "@/lib/dateRange";

// The heading, sub menu and period choice shared by the two views of the per-question statistics.
// A link is used for each view, so the choice is part of the address and no script is needed.
// The chosen period travels in the address, so it stays when the view is switched.
const views = [
  { id: "numbers", href: "/backoffice/report", label: "ตัวเลข" },
  { id: "pie", href: "/backoffice/charts", label: "Pie chart" },
] as const;

export type QuestionStatsView = (typeof views)[number]["id"];

export default function QuestionStatsHeader({ active, period }: { active: QuestionStatsView; period: Period }) {
  const current = views.find((view) => view.id === active)!;
  const query = periodQuery(period);

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

      <PeriodFilter action={current.href} mode={period.mode} from={period.from} to={period.to} error={period.error} />

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
