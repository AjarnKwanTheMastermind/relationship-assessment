"use client";

import { useEffect, useState, useTransition } from "react";
import { fieldRules, type CourseField, type CourseValues } from "@/lib/courseEdit";
import { saveCourse, type CourseFormState } from "@/app/backoffice/settings/courses/actions";

const inputClass =
  "w-full rounded-xl border border-brand-border bg-brand-black px-3 py-2 text-xs text-white focus:border-brand-pink focus:outline-none";

type FieldInfo = { field: CourseField; label: string; hint?: string; rows?: number };

const fields: FieldInfo[] = [
  { field: "title", label: "ชื่อคอร์ส (title)" },
  { field: "titleEn", label: "ชื่อภาษาอังกฤษ (english title)" },
  { field: "price", label: "ราคา (price)", hint: "เช่น ฿3,490" },
  { field: "fullPrice", label: "ราคาเต็ม (full price)", hint: "แสดงเป็นตัวอักษรขีดฆ่าข้างราคา เว้นว่างได้" },
  { field: "priceNote", label: "หมายเหตุราคา (price note)", hint: "แสดงใต้ราคาในหน้าต่างรายละเอียด เว้นว่างได้", rows: 3 },
  { field: "summary", label: "สรุปคอร์ส (summary)", rows: 3 },
  { field: "details", label: "รายละเอียดคอร์ส (details)", hint: "บรรทัดละ 1 รายการ", rows: 6 },
  { field: "modules", label: "เนื้อหาในคอร์ส (modules)", hint: "บรรทัดละ 1 รายการ เว้นว่างได้", rows: 6 },
  { field: "benefits", label: "สิทธิพิเศษ (benefits)", hint: "บรรทัดละ 1 รายการ เว้นว่างได้", rows: 4 },
  { field: "suitable", label: "เหมาะกับใคร (suitable)", hint: "เว้นว่างได้", rows: 4 },
];

export default function CourseForm({ courseKey, initial }: { courseKey: string; initial: CourseValues }) {
  const [state, setState] = useState<CourseFormState>({ errors: {}, values: initial });
  // A new key after every submit remounts the fields, so the password never stays in the box.
  const [round, setRound] = useState(0);
  const [pending, startTransition] = useTransition();
  // Until the page is ready the buttons stay off, so a form can never be sent the plain browser way.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  function submit(formData: FormData, intent: string) {
    formData.set("intent", intent);
    startTransition(async () => {
      const result = await saveCourse(formData);
      // A saved course redirects; only a mistake comes back here.
      if (result) {
        setState(result);
        setRound((n) => n + 1);
      }
    });
  }

  const { errors, message, values } = state;

  return (
    <form
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        submit(new FormData(event.currentTarget), submitter?.value === "reset" ? "reset" : "save");
      }}
      className="glass-card space-y-4 rounded-2xl p-4 sm:p-5"
    >
      <input type="hidden" name="key" value={courseKey} />

      {message === "form" && (
        <p role="alert" className="rounded-2xl border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-300">
          ไม่พบคอร์สนี้
        </p>
      )}
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="rounded-2xl border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-300">
          บันทึกไม่ได้ กรุณาแก้ไขช่องที่มีข้อความสีแดง
        </p>
      )}

      {fields.map(({ field, label, hint, rows }) => {
        const rule = fieldRules[field];
        const error = errors[field];
        const id = `course-${field}`;
        const common = {
          id,
          name: field,
          defaultValue: values[field],
          "aria-invalid": error ? true : undefined,
          "aria-describedby": `${id}-help`,
          className: inputClass,
        };
        return (
          <div key={`${field}:${round}`}>
            <label htmlFor={id} className="mb-1 block text-sm font-medium text-white">
              {label}
              {rule.required && <span className="ml-1 text-brand-pink">*</span>}
            </label>
            {rows ? <textarea {...common} rows={rows} /> : <input {...common} type="text" />}
            <p id={`${id}-help`} className={`mt-1 text-[11px] ${error ? "text-red-300" : "font-light text-gray-500"}`}>
              {error ?? hint ?? `ไม่เกิน ${rule.max} ตัวอักษร`}
            </p>
          </div>
        );
      })}

      <div>
        <label htmlFor="course-password" className="mb-1 block text-sm font-medium text-white">
          รหัสผ่านผู้ดูแล
        </label>
        <p className="mb-2 text-xs font-light text-gray-400">กรอกรหัสผ่านที่ใช้เข้า backoffice อีกครั้ง เพื่อยืนยันการเปลี่ยนแปลง</p>
        <input
          key={`password:${round}`}
          id="course-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={message === "password" ? true : undefined}
          className={inputClass}
        />
        {message === "password" && (
          <p role="alert" className="mt-1 text-[11px] text-red-300">
            รหัสผ่านผู้ดูแลไม่ถูกต้อง การตั้งค่ายังไม่เปลี่ยน
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" value="save" disabled={pending || !ready} className="gradient-pink-btn rounded-xl px-5 py-2 text-xs font-semibold text-white disabled:opacity-60">
          {pending ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <button
          type="submit"
          value="reset"
          disabled={pending || !ready}
          formNoValidate
          className="rounded-xl border border-brand-border px-5 py-2 text-xs text-gray-300 hover:border-brand-pink hover:text-white disabled:opacity-60"
        >
          คืนค่าเริ่มต้น
        </button>
      </div>
    </form>
  );
}
