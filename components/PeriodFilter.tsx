"use client";

import { useState } from "react";

const inputClass =
  "rounded-xl border border-brand-border bg-brand-black px-3 py-2 text-xs text-white [color-scheme:dark] focus:border-brand-pink focus:outline-none";

// Chooses between all the data and a range of days. The date boxes only appear for a range.
// The form is a plain GET, so the choice is part of the address and can be bookmarked.
export default function PeriodFilter({
  action,
  mode,
  from,
  to,
  error,
}: {
  action: string;
  mode: "all" | "range";
  from: string;
  to: string;
  error: string | null;
}) {
  const [selected, setSelected] = useState(mode);

  return (
    <form method="get" action={action} className="glass-card space-y-3 rounded-2xl p-4">
      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-medium text-white">ช่วงเวลาของข้อมูล</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-200">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="period"
              value="all"
              checked={selected === "all"}
              onChange={() => setSelected("all")}
              className="accent-[#ff2a85]"
            />
            ข้อมูลทั้งหมด (all time)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="period"
              value="range"
              checked={selected === "range"}
              onChange={() => setSelected("range")}
              className="accent-[#ff2a85]"
            />
            ระบุช่วงเวลา
          </label>
        </div>

        {selected === "range" && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-gray-300">
              <span className="mb-1 block">วันที่เริ่มต้น</span>
              <input type="date" name="from" defaultValue={from} required className={inputClass} />
            </label>
            <label className="text-xs text-gray-300">
              <span className="mb-1 block">วันที่สิ้นสุด</span>
              <input type="date" name="to" defaultValue={to} required className={inputClass} />
            </label>
          </div>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-300">
          {error}
        </p>
      )}

      <button type="submit" className="gradient-pink-btn rounded-xl px-5 py-2 text-xs font-semibold text-white">
        แสดงข้อมูล
      </button>
    </form>
  );
}
