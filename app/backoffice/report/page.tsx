import QuestionStatsHeader from "@/components/QuestionStatsHeader";
import { parsePeriod } from "@/lib/dateRange";
import { getAnswerCounts, getQuestionSetVersion, listQuestionSets } from "@/lib/db";
import { buildQuestionStats, parseVersion, formatPercent, optionColors } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: { period?: string | string[]; from?: string | string[]; to?: string | string[]; version?: string | string[] };
}) {
  const period = parsePeriod(searchParams.period, searchParams.from, searchParams.to);
  // The statistics are about one version of the questions (the newest unless the address says another), because a
  // position means a different answer in another version.
  const versions = await listQuestionSets();
  const version = parseVersion(searchParams.version, versions.map((v) => v.version));
  const set = await getQuestionSetVersion(version);
  // With a mistake in the dates nothing is counted, and the form explains the mistake.
  const counts = period.error || !set ? [] : await getAnswerCounts(period.mode === "range" ? period : undefined, version);
  const stats = set ? buildQuestionStats(counts, set.content) : [];

  return (
    <div className="space-y-4">
      <QuestionStatsHeader active="numbers" period={period} versions={versions} version={version} />

      {!period.error && stats.map((q) => (
        <section key={q.id} className="glass-card overflow-x-auto rounded-2xl p-4 sm:p-5">
          <p className="mb-1 text-[11px] text-brand-roseGold">{q.categoryTitle}</p>
          <h2 className="mb-3 text-sm font-medium leading-relaxed text-white">{q.question}</h2>
          <table className="w-full text-left text-xs">
            <thead className="text-gray-400">
              <tr>
                <th className="p-2 font-semibold">คำตอบ</th>
                <th className="w-20 p-2 text-right font-semibold">จำนวน</th>
                <th className="w-20 p-2 text-right font-semibold">ร้อยละ</th>
              </tr>
            </thead>
            <tbody className="text-gray-200">
              {q.options.map((o) => (
                <tr key={o.index} className="border-t border-brand-border/60">
                  <td className="p-2">
                    <span
                      aria-hidden
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: optionColors[o.score] }}
                    />
                    {o.text}
                  </td>
                  <td className="p-2 text-right tabular-nums">{o.picks.toLocaleString("en-US")}</td>
                  <td className="p-2 text-right tabular-nums">{formatPercent(o.percent)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-brand-border font-semibold text-white">
                <td className="p-2">รวม</td>
                <td className="p-2 text-right tabular-nums">{q.total.toLocaleString("en-US")}</td>
                <td className="p-2 text-right tabular-nums">{q.total === 0 ? "–" : "100%"}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      ))}
    </div>
  );
}
