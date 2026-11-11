import Link from "next/link";
import LineChart from "@/components/LineChart";
import ScrollToTop from "@/components/ScrollToTop";
import { getDailyResponseCounts } from "@/lib/db";
import { daysBetween, lastDays, parseDateRange } from "@/lib/dateRange";

export const dynamic = "force-dynamic";

const presets = [
  { days: 7, label: "7 วัน" },
  { days: 30, label: "30 วัน" },
  { days: 90, label: "90 วัน" },
  { days: 365, label: "1 ปี" },
];

const inputClass =
  "rounded-xl border border-brand-border bg-brand-black px-3 py-2 text-xs text-white [color-scheme:dark] focus:border-brand-pink focus:outline-none";

export default async function UsagePage({
  searchParams,
}: {
  searchParams: { from?: string | string[]; to?: string | string[] };
}) {
  const { from, to, error } = parseDateRange(searchParams.from, searchParams.to);
  const counts = error ? [] : await getDailyResponseCounts(from, to);
  const byDay = new Map(counts.map((c) => [c.day, c.responses]));
  const days = error ? [] : daysBetween(from, to);
  const total = counts.reduce((sum, c) => sum + c.responses, 0);
  const values = days.map((day) => byDay.get(day) ?? 0);
  const peak = Math.max(0, ...values);
  const peakDay = peak > 0 ? days[values.indexOf(peak)] : null;
  const average = days.length > 0 ? total / days.length : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-kanit text-2xl font-bold text-white">รายงานการใช้งานตามช่วงวันที่</h1>
        <p className="text-xs font-light text-gray-400">
          นับจำนวนครั้งที่ทำแบบประเมินจนจบ ตามเวลาประเทศไทย ผู้ใช้คนเดียวกันที่ทำซ้ำจะนับแยกเป็นแต่ละครั้ง
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-400">ช่วงเวลาล่าสุด:</span>
        {presets.map((preset) => {
          const range = lastDays(preset.days);
          const active = range.from === from && range.to === to;
          return (
            <Link
              key={preset.days}
              href={`/backoffice/usage?from=${range.from}&to=${range.to}`}
              aria-current={active ? "true" : undefined}
              className={`rounded-xl border px-3 py-1 ${
                active ? "border-brand-pink text-white" : "border-brand-border text-gray-300 hover:border-brand-pink hover:text-white"
              }`}
            >
              {preset.label}
            </Link>
          );
        })}
      </div>

      <form method="get" className="glass-card flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <label className="text-xs text-gray-300">
          <span className="mb-1 block">วันที่เริ่มต้น</span>
          <input type="date" name="from" defaultValue={from} required className={inputClass} />
        </label>
        <label className="text-xs text-gray-300">
          <span className="mb-1 block">วันที่สิ้นสุด</span>
          <input type="date" name="to" defaultValue={to} required className={inputClass} />
        </label>
        <button type="submit" className="gradient-pink-btn rounded-xl px-5 py-2 text-xs font-semibold text-white">
          ดูรายงาน
        </button>
      </form>

      {error ? (
        <>
          <ScrollToTop key={Date.now()} />
          <p role="alert" className="error-box">
            {error}
          </p>
        </>
      ) : (
        <>
          <section className="glass-card rounded-2xl p-5">
            <div className="font-kanit text-4xl font-bold tabular-nums text-white">{total.toLocaleString("en-US")}</div>
            <p className="mt-1 text-xs font-light text-gray-400">
              ครั้งที่ทำแบบประเมินจนจบ ระหว่าง {from} ถึง {to}
            </p>
          </section>

          <section className="glass-card rounded-2xl p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-medium text-white">กราฟเส้นจำนวนครั้งรายวัน</h2>
            <LineChart days={days} values={values} />
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
              <div className="flex gap-1">
                <dt className="text-gray-400">เฉลี่ยต่อวัน:</dt>
                <dd className="tabular-nums text-gray-200">{average.toLocaleString("en-US", { maximumFractionDigits: 1 })} ครั้ง</dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-gray-400">สูงสุด:</dt>
                <dd className="tabular-nums text-gray-200">
                  {peakDay ? `${peak.toLocaleString("en-US")} ครั้ง (${peakDay})` : "ไม่มีข้อมูลในช่วงนี้"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="glass-card overflow-x-auto rounded-2xl p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-medium text-white">จำนวนรายวัน</h2>
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400">
                <tr>
                  <th className="p-2 font-semibold">วันที่</th>
                  <th className="w-24 p-2 text-right font-semibold">จำนวนครั้ง</th>
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {days.map((day) => (
                  <tr key={day} className="border-t border-brand-border/60">
                    <td className="p-2 tabular-nums">{day}</td>
                    <td className="p-2 text-right tabular-nums">{(byDay.get(day) ?? 0).toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
