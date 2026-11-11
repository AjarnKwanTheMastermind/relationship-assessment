import Link from "next/link";
import LockNotice from "@/components/LockNotice";
import MailNotice from "@/components/MailNotice";
import QuestionsForm from "@/components/QuestionsForm";
import ScrollToTop from "@/components/ScrollToTop";
import TwoFactorStatus from "@/components/TwoFactorStatus";
import { getLatestQuestionSet, getPasswordLock, getQuestionSetVersion, listQuestionSets } from "@/lib/db";
import { builtInContent, setToInput } from "@/lib/questionSet";
import { twoFactorOn } from "@/lib/twoFactor";

export const dynamic = "force-dynamic";

const bangkok = (date: Date) => date.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

export default async function QuestionsPage({ searchParams }: { searchParams: { saved?: string; mail?: string; from?: string; tab?: string } }) {
  const [latest, versions] = await Promise.all([getLatestQuestionSet(), listQuestionSets()]);
  const twoFactor = twoFactorOn();
  // While saving is locked after too many wrong passwords, say so before anyone tries.
  const lockedUntil = twoFactor ? null : await getPasswordLock();

  // The form starts from the newest version, or from an older one chosen with "ใช้เป็นต้นแบบ". Saving always makes a new version.
  const fromVersion = /^\d{1,9}$/.test(searchParams.from ?? "") ? Number(searchParams.from) : null;
  const template = fromVersion !== null && fromVersion !== latest?.version ? await getQuestionSetVersion(fromVersion) : null;
  const base = template?.content ?? latest?.content ?? builtInContent();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-kanit text-2xl font-bold text-white">คำถามและคำตอบ</h1>
        <p className="text-xs font-light text-gray-400">
          {latest ? `ชุดที่ผู้ทำแบบประเมินเห็นตอนนี้: เวอร์ชัน ${latest.version} (บันทึกเมื่อ ${bangkok(latest.createdAt)})` : "ยังไม่มีชุดคำถามในฐานข้อมูล ใช้คำถามเริ่มต้น"}
        </p>
        <p className="mt-1 text-xs font-light text-gray-500">
          ทุกครั้งที่บันทึกจะได้เวอร์ชันใหม่ เวอร์ชันเก่าเก็บไว้ในฐานข้อมูล และคำตอบของผู้ทำแบบประเมินจะเก็บเลขเวอร์ชันที่เขาเห็นไว้ด้วย
          หมวดและลำดับของคำถามเปลี่ยนไม่ได้ แก้ได้เฉพาะข้อความและคะแนนของคำตอบ
        </p>
      </div>

      {searchParams.saved === "1" && (
        <>
          {/* A new key on every render, so the page scrolls up again after each successful save. */}
          <ScrollToTop key={Date.now()} />
          <p role="status" className="rounded-2xl border border-brand-pink/40 bg-brand-pink/10 p-4 text-sm text-brand-roseGold">
            บันทึกแล้ว เป็นเวอร์ชัน {latest?.version} ผู้ทำแบบประเมินจะเห็นชุดใหม่ทันทีหรือภายในไม่กี่นาที
          </p>
          <MailNotice status={searchParams.mail} />
        </>
      )}
      {searchParams.saved === "unchanged" && (
        <>
          <ScrollToTop key={Date.now()} />
          <p role="status" className="rounded-2xl border border-brand-border p-4 text-sm text-gray-300">
            ไม่มีอะไรเปลี่ยนจากเวอร์ชันล่าสุด จึงไม่ได้สร้างเวอร์ชันใหม่
          </p>
        </>
      )}

      <LockNotice until={lockedUntil} />

      {template && (
        <p className="rounded-xl border border-brand-border px-3 py-2 text-xs text-gray-300">
          ฟอร์มนี้เริ่มจากเวอร์ชัน {template.version} เมื่อบันทึกจะเป็นเวอร์ชันใหม่ต่อจากเวอร์ชัน {latest?.version}{" "}
          <Link href="/backoffice/settings/questions" className="text-brand-roseGold underline">
            ใช้เวอร์ชันล่าสุดแทน
          </Link>
        </p>
      )}

      <QuestionsForm
        key={`${latest?.version ?? 0}:${template?.version ?? 0}`}
        initial={setToInput(base)}
        twoFactor={twoFactor}
        initialTab={/^[123]$/.test(searchParams.tab ?? "") ? Number(searchParams.tab) : 1}
      />

      <TwoFactorStatus />

      <section className="glass-card overflow-x-auto rounded-2xl p-4 text-xs text-gray-300 sm:p-5">
        <h2 className="mb-2 text-sm font-medium text-white">ประวัติเวอร์ชัน</h2>
        <table className="w-full min-w-[34rem] text-left">
          <thead className="text-gray-400">
            <tr>
              <th className="p-2 font-semibold">เวอร์ชัน</th>
              <th className="p-2 font-semibold">บันทึกเมื่อ</th>
              <th className="p-2 font-semibold">หมายเหตุ</th>
              <th className="p-2 text-right font-semibold">คำตอบ</th>
              <th className="p-2 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.version} className="border-t border-brand-border/60">
                <td className="p-2 text-white">
                  {v.version}
                  {v.version === latest?.version ? <span className="ml-2 text-emerald-300">ล่าสุด</span> : null}
                </td>
                <td className="p-2">{bangkok(v.createdAt)}</td>
                <td className="p-2">{v.note || <span className="text-gray-500">–</span>}</td>
                <td className="p-2 text-right tabular-nums">{v.responses.toLocaleString("en-US")}</td>
                <td className="space-x-2 whitespace-nowrap p-2 text-right">
                  <Link
                    href={`/backoffice/settings/questions/versions/${v.version}`}
                    className="rounded-xl border border-brand-border px-3 py-1 text-gray-300 hover:border-brand-pink hover:text-white"
                  >
                    ดู
                  </Link>
                  {v.version !== latest?.version && (
                    <Link
                      href={`/backoffice/settings/questions?from=${v.version}`}
                      className="rounded-xl border border-brand-border px-3 py-1 text-gray-300 hover:border-brand-pink hover:text-white"
                    >
                      ใช้เป็นต้นแบบ
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
