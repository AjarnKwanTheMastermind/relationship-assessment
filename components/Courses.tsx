"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Info, MessageCircle, X } from "lucide-react";
import { courses, LINE_URL, type Course } from "@/lib/courses";

export default function Courses() {
  const [open, setOpen] = useState<Course | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section className="glass-card space-y-6 rounded-3xl border border-brand-border p-6 sm:p-8">
      <div className="mx-auto max-w-xl text-center">
        <span className="rounded-full border border-brand-pink/30 bg-brand-pink/15 px-3 py-1 text-[11px] font-semibold text-brand-pink">
          MASTERMIND STRATEGIC COURSES
        </span>
        <h2 className="mb-1 mt-2.5 font-kanit text-xl font-bold text-white sm:text-2xl">คอร์สเรียนจากอาจารย์ขวัญ</h2>
        <p className="text-xs font-light text-gray-400 sm:text-sm">คอร์สจิตวิทยาพฤติกรรมมนุษย์และการบริหารเสน่ห์</p>
      </div>

      <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-3">
        {courses.map((course) => (
          <div
            key={course.key}
            className="flex flex-col justify-between rounded-2xl border border-brand-pink/40 bg-brand-black/90 p-5 shadow-lg transition-all hover:border-brand-pink"
          >
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                <span className="rounded-full border border-brand-pink/30 bg-brand-pink/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-pink">
                  {course.tagline}
                </span>
                <span className="text-xs font-semibold text-brand-gold">
                  {course.price}{" "}
                  {course.fullPrice && (
                    <span className="text-[10px] font-normal text-gray-500 line-through">{course.fullPrice}</span>
                  )}
                </span>
              </div>
              <h3 className="mb-2 font-kanit text-lg font-bold text-white">{course.title}</h3>
              <p className="mb-4 text-xs font-light leading-relaxed text-gray-300">{course.summary}</p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setOpen(course)}
                className="flex w-full items-center justify-center space-x-1 rounded-xl border border-brand-border py-2 text-center text-xs font-medium text-gray-300 transition-all hover:border-brand-pink hover:text-white"
              >
                <Info className="h-3.5 w-3.5" />
                <span>ดูรายละเอียดคอร์ส</span>
              </button>
              <a
                href={LINE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="gradient-pink-btn flex w-full items-center justify-center space-x-1.5 rounded-xl py-2.5 text-center text-xs font-medium text-white shadow-md"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>สมัครเรียน (LINE: @aj.kwan)</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-brand-pink/40 bg-gradient-to-r from-brand-pink/20 via-brand-card to-brand-black p-6 text-center">
        <h3 className="mb-1 font-kanit text-base font-bold text-white sm:text-lg">ต้องการปรึกษาเคสส่วนตัวกับอาจารย์ขวัญ?</h3>
        <p className="mb-4 text-xs font-light text-gray-300">วิเคราะห์ปัญหาความสัมพันธ์รายบุคคล วางแผนอย่างเป็นระบบ</p>
        <a
          href={LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="gradient-pink-btn inline-flex items-center justify-center space-x-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-lg sm:text-sm"
        >
          <MessageCircle className="h-4 w-4" />
          <span>แอด LINE ปรึกษาอาจารย์ขวัญ (@aj.kwan)</span>
        </a>
      </div>

      {/* Portal: the card's backdrop-filter would otherwise trap position: fixed inside the card. */}
      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
          onClick={(e) => e.target === e.currentTarget && setOpen(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        >
          <div className="glass-card box-glow relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-brand-pink/40 p-6">
            <button
              type="button"
              aria-label="ปิดหน้าต่าง"
              onClick={() => setOpen(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-brand-border text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-1 pr-10 font-kanit text-xl font-bold text-white sm:text-2xl">{open.title}</h3>
            <div className="mb-3 text-sm font-bold text-brand-gold">{open.price}</div>
            <p className="mb-4 text-xs font-light leading-relaxed text-gray-300">{open.summary}</p>
            <div className="mb-4 rounded-2xl border border-brand-border/80 bg-brand-black/80 p-4">
              <h4 className="mb-2.5 text-xs font-bold text-brand-roseGold">สิ่งที่จะได้เรียนรู้ในคอร์ส:</h4>
              <ul className="space-y-2 text-xs font-light text-gray-300">
                {open.details.map((item) => (
                  <li key={item} className="flex items-start">
                    <Check className="mr-2 mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-pink" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-brand-pink/20 bg-brand-pink/10 p-3 text-xs italic text-brand-roseGold">
              {open.suitable}
            </div>
            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="gradient-pink-btn mt-6 flex items-center justify-center space-x-2 rounded-xl px-5 py-2 text-xs font-bold text-white"
            >
              <MessageCircle className="h-4 w-4" />
              <span>สอบถามเพิ่มเติมทาง LINE</span>
            </a>
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}
