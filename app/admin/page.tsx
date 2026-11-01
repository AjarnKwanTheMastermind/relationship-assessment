import type { Metadata } from "next";
import { getAdminStats, getRecentResponses } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const [stats, recent] = await Promise.all([getAdminStats(), getRecentResponses()]);

  const tiles = [
    { label: "ผู้ทำแบบประเมินทั้งหมด", value: stats.total },
    { label: "คะแนนเฉลี่ย", value: stats.averagePercent === null ? "–" : `${stats.averagePercent}%` },
    { label: "วิกฤต", value: stats.critical },
    { label: "ควรเฝ้าระวัง", value: stats.warning },
    { label: "สมบูรณ์", value: stats.safe },
    { label: "มีสัญญาณด้านความปลอดภัย", value: stats.safetyFlagged },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-kanit text-2xl font-bold text-white">ภาพรวมผลการประเมิน</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="glass-card rounded-2xl p-4">
            <div className="font-kanit text-2xl font-bold text-white">{t.value}</div>
            <div className="text-xs font-light text-gray-400">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-x-auto rounded-2xl p-4">
        <table className="w-full text-left text-xs">
          <thead className="text-gray-400">
            <tr>
              <th className="p-2 font-semibold">เวลา</th>
              <th className="p-2 font-semibold">คะแนน</th>
              <th className="p-2 font-semibold">ระดับ</th>
              <th className="p-2 font-semibold">หมวด 1/2/3</th>
              <th className="p-2 font-semibold">ความปลอดภัย</th>
            </tr>
          </thead>
          <tbody className="text-gray-200">
            {recent.map((r) => (
              <tr key={r.id} className="border-t border-brand-border/60">
                <td className="whitespace-nowrap p-2">
                  {r.created_at.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                </td>
                <td className="p-2">{r.percent_score}%</td>
                <td className="p-2">{r.band}</td>
                <td className="p-2">
                  {r.cat1_score}/6 · {r.cat2_score}/6 · {r.cat3_score}/8
                </td>
                <td className="p-2">{r.safety_flag ? "⚠" : ""}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  ยังไม่มีข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
