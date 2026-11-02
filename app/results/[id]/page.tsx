import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Compass, Lightbulb, LifeBuoy, Phone, RotateCw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import Courses from "@/components/Courses";
import { getAnswers } from "@/lib/db";
import { helplines } from "@/lib/helplines";
import { getSettings } from "@/lib/settings";
import { scoreAnswers, type Band, type CategoryStatus } from "@/lib/quiz";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bandStyles: Record<Band, { box: string; text: string }> = {
  critical: { box: "border-red-500/50 bg-red-950/20 box-glow-danger", text: "text-red-500" },
  warning: { box: "border-amber-500/50 bg-amber-950/20", text: "text-amber-400" },
  safe: { box: "border-brand-pink/50 bg-brand-pink/10 box-glow", text: "text-brand-pink neon-glow-text" },
};

const statusStyles: Record<CategoryStatus, { label: string; badge: string; card: string }> = {
  red: { label: "Red Flag", badge: "bg-red-500/20 text-red-400 border-red-500/40", card: "border-red-500/40" },
  warning: {
    label: "Warning",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    card: "border-amber-500/30",
  },
  healthy: {
    label: "Healthy",
    badge: "bg-brand-pink/20 text-brand-pink border-brand-pink/40",
    card: "border-brand-pink/30",
  },
};

const categoryIcons = { 1: ShieldCheck, 2: Compass, 3: SlidersHorizontal };

export default async function ResultsPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const answers = await getAnswers(params.id);
  if (!answers) notFound();

  const result = scoreAnswers(answers);
  const band = bandStyles[result.band];
  // Courses are never shown to someone flagged for safety, so their settings aren't even read.
  const settings = result.safetyFlag ? null : await getSettings();

  return (
    <div className="space-y-6">
      <div className="glass-card box-glow relative overflow-hidden rounded-3xl border-t-4 border-t-brand-pink p-6 text-center sm:p-8">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-pink">
          STRATEGIC RELATIONSHIP AUDIT REPORT
        </div>
        <h1 className="mb-1 font-kanit text-2xl font-bold text-white sm:text-3xl">
          รายงานผลการวิเคราะห์สถานะความสัมพันธ์
        </h1>
        <p className="mb-6 text-xs text-gray-400 sm:text-sm">
          วิเคราะห์ด้วยหลักกลยุทธ์และจิตวิทยาพฤติกรรมมนุษย์ โดย อาจารย์ขวัญ The Mastermind
        </p>
        <div className={`mx-auto mb-2 max-w-xl rounded-2xl border p-5 sm:p-6 ${band.box}`}>
          <div className="mb-1 text-xs text-gray-400 sm:text-sm">ดัชนีสุขภาพความสัมพันธ์ภาพรวม (Overall Health Score)</div>
          <div className={`my-2 font-kanit text-3xl font-extrabold sm:text-4xl ${band.text}`}>
            {result.percentScore}% ({result.bandLabel})
          </div>
          <p className="text-xs font-light leading-relaxed text-gray-300 sm:text-sm">{result.overallDesc}</p>
        </div>
      </div>

      {result.safetyFlag && (
        <section className="box-glow-danger rounded-3xl border border-red-500/50 bg-red-950/30 p-6 sm:p-8">
          <div className="mb-3 flex items-center space-x-3">
            <LifeBuoy className="h-6 w-6 shrink-0 text-red-400" />
            <h2 className="font-kanit text-lg font-bold text-white sm:text-xl">คุณไม่จำเป็นต้องเผชิญเรื่องนี้คนเดียว</h2>
          </div>
          <p className="mb-4 text-sm font-light leading-relaxed text-gray-200">
            คำตอบของคุณมีสัญญาณที่เกี่ยวกับความปลอดภัย หากคุณรู้สึกไม่ปลอดภัย ขอให้ติดต่อหน่วยงานเหล่านี้ได้ทันที
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {helplines.map(({ number, name }) => (
              <li key={number}>
                <a
                  href={`tel:${number}`}
                  className="flex h-full items-center space-x-3 rounded-2xl border border-red-500/30 bg-brand-black/70 p-4 hover:border-red-400"
                >
                  <Phone className="h-4 w-4 shrink-0 text-red-400" />
                  <span>
                    <span className="block font-kanit text-xl font-bold text-white">{number}</span>
                    <span className="block text-xs font-light text-gray-300">{name}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-kanit text-base font-bold text-white sm:text-lg">
          วิเคราะห์เจาะลึกแยกรายหมวดหมู่ (Category Analysis)
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {result.categories.map((cat) => {
            const status = statusStyles[cat.status];
            const Icon = categoryIcons[cat.num];
            return (
              <div key={cat.num} className={`glass-card flex flex-col justify-between rounded-2xl border p-5 ${status.card}`}>
                <div>
                  <div className="mb-3 flex items-start justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">หมวดที่ {cat.num}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.badge}`}>
                      {status.label}
                    </span>
                  </div>
                  <h3 className="mb-2 flex items-center font-kanit text-base font-bold text-white">
                    <Icon className="mr-2 h-4 w-4 shrink-0 text-brand-pink" /> {cat.title}
                  </h3>
                  <p className="mb-4 text-xs font-light leading-relaxed text-gray-300">{cat.desc}</p>
                </div>
                <div className="border-t border-brand-border/60 pt-3 text-xs text-gray-400">
                  <span className="mb-0.5 block font-semibold text-white">การประเมินเชิงกลยุทธ์:</span>
                  {cat.action}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass-card rounded-3xl border border-brand-pink/30 p-6 sm:p-8">
        <div className="mb-4 flex items-center space-x-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-pink bg-brand-pink/20 text-brand-pink">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-kanit text-base font-bold text-white sm:text-lg">
              คำแนะนำเชิงยุทธศาสตร์ (Strategic Decision Guide)
            </h2>
            <p className="text-xs font-light text-brand-roseGold">โดย อาจารย์ขวัญ | The Mastermind</p>
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-brand-border/80 bg-brand-black/60 p-4 text-xs font-light leading-relaxed text-gray-200 sm:p-5 sm:text-sm">
          {result.guide.map((g) => (
            <p key={g.heading}>
              <strong className="text-brand-pink">{g.heading}</strong> {g.body}
            </p>
          ))}
        </div>
      </section>

      {settings && <Courses lineUrl={settings.lineUrl} courses={settings.courses} />}

      <div className="text-center">
        <Link
          href="/quiz"
          className="inline-flex items-center rounded-xl border border-brand-border px-5 py-2.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
        >
          <RotateCw className="mr-1.5 h-3.5 w-3.5" /> ประเมินใหม่อีกครั้ง
        </Link>
      </div>
    </div>
  );
}
