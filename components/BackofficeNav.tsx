"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// "สถิติรายข้อ" holds two views, numbers and pie charts, so it stays highlighted on both addresses.
const links = [
  { href: "/backoffice/report", label: "สถิติรายข้อ", also: ["/backoffice/charts"] },
  { href: "/backoffice/usage", label: "การใช้งาน", also: [] },
  { href: "/backoffice/settings", label: "ตั้งค่า", also: [] },
];

export default function BackofficeNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Backoffice" className="flex flex-wrap items-center gap-2 border-b border-brand-border pb-3">
      <span className="mr-2 font-kanit text-sm font-bold text-white">Backoffice</span>
      {links.map(({ href, label, also }) => {
        const active = [href, ...also].some((base) => pathname === base || pathname.startsWith(`${base}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-xl border px-4 py-1.5 text-xs ${
              active
                ? "gradient-pink-btn border-transparent font-semibold text-white"
                : "border-brand-border text-gray-300 hover:border-brand-pink hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
