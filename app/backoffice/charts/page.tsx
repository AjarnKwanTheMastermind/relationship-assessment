import PieChart from "@/components/PieChart";
import QuestionStatsHeader from "@/components/QuestionStatsHeader";
import { parsePeriod } from "@/lib/dateRange";
import { getAnswerCounts } from "@/lib/db";
import { buildQuestionStats, formatPercent, optionColors, optionLevels } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function ChartsPage({
  searchParams,
}: {
  searchParams: { period?: string | string[]; from?: string | string[]; to?: string | string[] };
}) {
  const period = parsePeriod(searchParams.period, searchParams.from, searchParams.to);
  // With a mistake in the dates nothing is counted, and the form explains the mistake.
  const stats = buildQuestionStats(period.error ? [] : await getAnswerCounts(period.mode === "range" ? period : undefined));

  return (
    <div className="space-y-4">
      <QuestionStatsHeader active="pie" period={period} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {!period.error && stats.map((q) => (
          <section key={q.id} className="glass-card flex flex-col rounded-2xl p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-medium leading-relaxed text-white">{q.question}</h2>
            {q.total === 0 ? (
              <p className="my-auto py-8 text-center text-xs text-gray-500">ยังไม่มีข้อมูล</p>
            ) : (
              <>
                <PieChart options={q.options} label={`สัดส่วนคำตอบข้อ ${q.id}`} />
                <ul className="mt-4 space-y-2 text-xs text-gray-200">
                  {q.options.map((o) => (
                    <li key={o.index} className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: optionColors[o.index] }}
                      />
                      <span className="flex-1 leading-relaxed">
                        <span className="font-semibold text-white">{optionLevels[o.index]}:</span> {o.text}
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        {formatPercent(o.percent)} ({o.picks.toLocaleString("en-US")})
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
