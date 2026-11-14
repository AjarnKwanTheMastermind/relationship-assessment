import type { Metadata } from "next";
import BackofficeNav from "@/components/BackofficeNav";
import { appVersionLabel } from "@/lib/appVersion";

export const metadata: Metadata = {
  title: "Backoffice",
  robots: { index: false, follow: false },
};

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <BackofficeNav />
      {children}
      {/* Which build is running, so the administrator can compare it with the deploy on Netlify. */}
      <p className="pt-2 text-center text-[11px] font-light text-gray-600">{appVersionLabel()}</p>
    </div>
  );
}
