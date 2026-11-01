import Link from "next/link";
import { ArrowRight, Compass, Crown, ShieldCheck, SlidersHorizontal } from "lucide-react";

const overview = [
  { icon: ShieldCheck, title: "หมวดที่ 1 (ข้อ 1-3)", text: "ความปลอดภัย & ขอบเขต (เช็ค Toxic/ทำร้าย)" },
  { icon: Compass, title: "หมวดที่ 2 (ข้อ 4-6)", text: "คุณค่าหลักของชีวิต (เป้าหมาย/ศีลธรรม/ตัวตน)" },
  { icon: SlidersHorizontal, title: "หมวดที่ 3 (ข้อ 7-10)", text: "ทักษะ & สไตล์ (การสื่อสาร/เวลา/อีโก้)" },
];

export default function IntroPage() {
  return (
    <div className="glass-card box-glow rounded-3xl border border-brand-pink/20 p-6 text-center sm:p-10">
      <div className="mb-5 inline-flex items-center space-x-2 rounded-full border border-brand-pink/40 bg-brand-pink/10 px-4 py-1.5 text-xs font-semibold text-brand-pink">
        <Crown className="h-3.5 w-3.5" />
        <span>ไม่ใช่แค่ทฤษฎี แต่คือชีวิตจริง</span>
      </div>

      <h1 className="mb-3 font-kanit text-2xl font-extrabold leading-snug tracking-wide text-white sm:text-4xl">
        แบบประเมินสถานะความสัมพันธ์เชิงยุทธศาสตร์
        <span className="mt-2 block bg-gradient-to-r from-brand-pink via-brand-roseGold to-white bg-clip-text text-lg font-normal text-transparent sm:text-2xl">
          (Strategic Relationship Audit)
        </span>
      </h1>

      <p className="mx-auto mb-8 max-w-2xl text-sm font-light leading-relaxed text-gray-300 sm:text-base">
        วัดระดับสุขภาพความสัมพันธ์ของคุณด้วยตรรกะ จิตวิทยาพฤติกรรมมนุษย์ และยุทธศาสตร์จริง วิเคราะห์ครบ 3 มิติสำคัญ
        เพื่อให้คุณตัดสินใจชีวิตได้อย่างเฉียบคม โดยไม่อิงอารมณ์หรืออีโก้
      </p>

      <div className="mx-auto mb-8 grid max-w-3xl grid-cols-1 gap-3 text-left text-xs sm:grid-cols-3 sm:text-sm">
        {overview.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="flex items-start space-x-3 rounded-2xl border border-brand-border/80 bg-brand-black/80 p-4"
          >
            <div className="shrink-0 rounded-lg bg-brand-pink/10 p-2 text-brand-pink">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="mb-0.5 font-semibold text-white">{title}</div>
              <div className="text-xs text-gray-400">{text}</div>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/quiz"
        className="gradient-pink-btn inline-flex w-full items-center justify-center space-x-3 rounded-2xl px-9 py-4 text-lg font-semibold text-white shadow-xl sm:w-auto"
      >
        <span>เริ่มทำแบบประเมิน (10 ข้อ)</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-4 text-xs font-light text-gray-500">
        * ใช้เวลาประเมินเพียง 2-3 นาที รับรายงานผลวิเคราะห์ฉบับเต็มทันที
        <br />* คำตอบถูกบันทึกแบบไม่ระบุตัวตน ไม่มีการเก็บชื่อหรือข้อมูลติดต่อ
      </p>
    </div>
  );
}
