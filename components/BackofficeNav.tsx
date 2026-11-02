"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/backoffice/report", label: "รายงาน" },
  { href: "/backoffice/charts", label: "แผนภูมิ" },
  { href: "/backoffice/usage", label: "การใช้งาน" },
  { href: "/backoffice/settings", label: "ตั้งค่า" },
];

export default function BackofficeNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Backoffice" className="flex flex-wrap items-center gap-2 border-b border-brand-border pb-3">
      <span className="mr-2 font-kanit text-sm font-bold text-white">Backoffice</span>
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
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
