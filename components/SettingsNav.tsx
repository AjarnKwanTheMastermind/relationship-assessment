"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The sub menu of the Settings tab. Contact is the page at /backoffice/settings itself, so it is highlighted only
// on that exact address; the course pages (the list and each edit page) all keep "รายละเอียดคอร์ส" highlighted.
const links = [
  { href: "/backoffice/settings", label: "ติดต่อ", exact: true },
  { href: "/backoffice/settings/courses", label: "รายละเอียดคอร์ส", exact: false },
  { href: "/backoffice/settings/questions", label: "คำถามและคำตอบ", exact: false },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="เมนูย่อยการตั้งค่า" className="flex flex-wrap items-center gap-2 text-xs">
      {links.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-xl border px-4 py-1 ${
              active
                ? "border-brand-pink bg-brand-pink/10 font-semibold text-white"
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
