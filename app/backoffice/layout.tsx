import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Backoffice",
  robots: { index: false, follow: false },
};

const links = [
  { href: "/backoffice/report", label: "รายงาน" },
  { href: "/backoffice/charts", label: "แผนภูมิ" },
  { href: "/backoffice/usage", label: "การใช้งาน" },
  { href: "/backoffice/settings", label: "ตั้งค่า" },
];

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <nav aria-label="Backoffice" className="flex flex-wrap items-center gap-2 border-b border-brand-border pb-3">
        <span className="mr-2 font-kanit text-sm font-bold text-white">Backoffice</span>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="whitespace-nowrap rounded-xl border border-brand-border px-4 py-1.5 text-xs text-gray-300 hover:border-brand-pink hover:text-white"
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
