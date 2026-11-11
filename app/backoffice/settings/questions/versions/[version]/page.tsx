import Link from "next/link";
import { notFound } from "next/navigation";
import { getLatestQuestionSet, getQuestionSetVersion, listQuestionSets } from "@/lib/db";
import { scoreLabels } from "@/lib/questionSet";
import { optionColors } from "@/lib/stats";

export const dynamic = "force-dynamic";

// A saved version, read-only. Versions are never changed: to change anything, save a new version.
export default async function QuestionVersionPage({ params }: { params: { version: string } }) {
  if (!/^\d{1,9}$/.test(params.version)) notFound();
  const version = Number(params.version);
  const [found, latest, versions] = await Promise.all([getQuestionSetVersion(version), getLatestQuestionSet(), listQuestionSets()]);
  if (!found) notFound();
  const summary = versions.find((v) => v.version === version);
  const isLatest = latest?.version === version;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/backoffice/settings/questions" className="text-xs text-gray-400 hover:text-white">
          ← กลับไปหน้าคำถามและคำตอบ
        </Link>
        <h1 className="mt-2 font-kanit text-2xl font-bold text-white">
          ชุดคำถามเวอร์ชัน {version}
          {isLatest && <span className="ml-3 text-sm font-normal text-emerald-300">ล่าสุด</span>}
        </h1>
        <p className="text-xs font-light text-gray-400">
          บันทึกเมื่อ {found.createdAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
          {found.note ? ` · หมายเหตุ: ${found.note}` : ""} · มีผู้ตอบด้วยชุดนี้ {(summary?.responses ?? 0).toLocaleString("en-US")} คน
        </p>
        <p className="mt-1 text-xs font-light text-gray-500">หน้านี้ดูอย่างเดียว เวอร์ชันที่บันทึกแล้วแก้ไขไม่ได้</p>
        {!isLatest && (
          <Link
            href={`/backoffice/settings/questions?from=${version}`}
            className="mt-3 inline-block rounded-xl border border-brand-border px-4 py-1 text-xs text-gray-300 hover:border-brand-pink hover:text-white"
          >
            ใช้เป็นต้นแบบของเวอร์ชันใหม่
          </Link>
        )}
      </div>

      {found.content.questions.map((q) => (
        <section key={q.id} className="glass-card space-y-2 rounded-2xl p-4 text-xs text-gray-300 sm:p-5">
          <p className="text-[11px] text-brand-roseGold">{found.content.categories[q.category - 1].title}</p>
          <h2 className="text-sm font-medium leading-relaxed text-white">{q.question}</h2>
          <ul className="space-y-2">
            {q.options.map((o, i) => (
              <li key={i} className="flex items-start gap-2">
                <span aria-hidden className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: optionColors[o.score] }} />
                <span className="flex-1 leading-relaxed">{o.text}</span>
                <span className="shrink-0 text-gray-400">{scoreLabels[o.score]}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
