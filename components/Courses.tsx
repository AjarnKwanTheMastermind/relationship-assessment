"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Info, MessageCircle, Pin, Star, X } from "lucide-react";
import type { Course } from "@/lib/courses";
import { lineHandle, lineLabel } from "@/lib/lineLink";

export default function Courses({ lineUrl, courses, qr }: { lineUrl: string; courses: Course[]; qr?: ReactNode }) {
  const [open, setOpen] = useState<Course | null>(null);
  const handle = lineHandle(lineUrl);

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
                  {course.titleEn}
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
                href={lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="gradient-pink-btn flex w-full items-center justify-center space-x-1.5 rounded-xl py-2.5 text-center text-xs font-medium text-white shadow-md"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>สมัครเรียน ({lineLabel(lineUrl)})</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-brand-pink/40 bg-gradient-to-r from-brand-pink/20 via-brand-card to-brand-black p-6">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <h3 className="mb-1 font-kanit text-base font-bold text-white sm:text-lg">ต้องการปรึกษาเคสส่วนตัวกับอาจารย์ขวัญ?</h3>
            <p className="mb-4 text-xs font-light text-gray-300">วิเคราะห์ปัญหาความสัมพันธ์รายบุคคล วางแผนอย่างเป็นระบบ</p>
            <a
              href={lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gradient-pink-btn inline-flex items-center justify-center space-x-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-lg sm:text-sm"
            >
              <MessageCircle className="h-4 w-4" />
              <span>แอด LINE ปรึกษาอาจารย์ขวัญ{handle ? ` (${handle})` : ""}</span>
            </a>
          </div>
          {qr && (
            <figure className="shrink-0 text-center">
              <div className="mx-auto w-40 overflow-hidden rounded-xl border border-white/10 bg-white p-1 shadow-lg sm:w-44">{qr}</div>
              <figcaption className="mt-2 text-[11px] font-light text-gray-300">สแกน QR Code เพื่อแอด LINE</figcaption>
            </figure>
          )}
        </div>
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
            <span className="mb-2 inline-block rounded-full border border-brand-pink/30 bg-brand-pink/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-pink">
              {open.titleEn}
            </span>
            <h3 className="mb-1 pr-10 font-kanit text-xl font-bold text-white sm:text-2xl">{open.title}</h3>
            <div className="mb-3 text-sm font-bold text-brand-gold">
              {open.price}{" "}
              {open.fullPrice && <span className="text-xs font-normal text-gray-500 line-through">{open.fullPrice}</span>}
              {open.priceNote && <p className="mt-1 text-[11px] font-light text-gray-400">{open.priceNote}</p>}
            </div>
            <p className="mb-4 text-xs font-light leading-relaxed text-gray-300">{open.summary}</p>
            <div className="mb-4 rounded-2xl border border-brand-border/80 bg-brand-black/80 p-4">
              <h4 className="mb-2.5 text-xs font-bold text-brand-roseGold">สิ่งที่จะได้เรียนรู้ในคอร์ส:</h4>
              <ul className="space-y-2 text-xs font-light text-gray-300">
                {open.details.map((item, index) => (
                  <li key={`${index}:${item}`} className="flex items-start">
                    <Check className="mr-2 mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-pink" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {open.modules && (
                <ul className="mt-4 space-y-2 border-t border-brand-border/60 pt-4 text-xs font-light text-gray-300">
                  {open.modules.map((item, index) => (
                    <li key={`${index}:${item}`} className="flex items-start">
                      <Pin className="mr-2 mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-roseGold" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {open.benefits && (
              <ul className="mb-4 space-y-2 rounded-2xl border border-brand-gold/30 bg-brand-black/80 p-4 text-xs font-light text-gray-300">
                {open.benefits.map((item, index) => (
                  <li key={`${index}:${item}`} className="flex items-start">
                    <Star className="mr-2 mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {open.suitable && (
              <div className="rounded-xl border border-brand-pink/20 bg-brand-pink/10 p-3 text-xs italic text-brand-roseGold">
                {open.suitable}
              </div>
            )}
            <a
              href={lineUrl}
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
