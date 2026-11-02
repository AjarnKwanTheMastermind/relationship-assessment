import type { Metadata } from "next";
import BackofficeNav from "@/components/BackofficeNav";

export const metadata: Metadata = {
  title: "Backoffice",
  robots: { index: false, follow: false },
};

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <BackofficeNav />
      {children}
    </div>
  );
}
