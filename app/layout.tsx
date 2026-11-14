import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Kanit, Prompt } from "next/font/google";
import { Crown, MessageCircle } from "lucide-react";
import NavigationProgress from "@/components/NavigationProgress";
import { lineLabel } from "@/lib/lineLink";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
});
const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  title: "แบบประเมินสถานะความสัมพันธ์เชิงยุทธศาสตร์ | อาจารย์ขวัญ The Mastermind",
  description: "วัดระดับสุขภาพความสัมพันธ์ของคุณ 10 ข้อ 3 มิติ พร้อมรายงานผลทันที",
};

// Pages built from the saved settings are rebuilt at least this often (seconds). Saving a
// setting in the backoffice clears them immediately.
export const revalidate = 300;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lineUrl } = await getSettings();

  return (
    <html lang="th" className={`${prompt.variable} ${kanit.variable}`}>
      <body className="relative flex min-h-screen flex-col justify-between font-prompt selection:bg-brand-pink selection:text-white">
        <div className="bg-pulse" />
        {/* useSearchParams needs a Suspense boundary, or the static pages would turn dynamic. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>

        <header className="sticky top-0 z-10 border-b border-brand-border bg-brand-black/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
            <Link href="/" aria-label="กลับไปหน้าแรก" className="flex items-center space-x-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-pink bg-brand-card shadow-[0_0_12px_rgba(255,42,133,0.5)]">
                <Crown className="h-5 w-5 text-brand-pink" />
              </div>
              <div>
                <div className="font-kanit text-base font-bold leading-tight tracking-wide text-white sm:text-lg">
                  อาจารย์ขวัญ <span className="neon-glow-text text-brand-pink">| The Mastermind</span>
                </div>
                <p className="text-[11px] font-light text-brand-roseGold sm:text-xs">
                  ความเข้าใจมนุษย์ × กลยุทธ์ × ประสบการณ์จริง
                </p>
              </div>
            </Link>
            <a
              href={lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center space-x-1.5 rounded-full border border-brand-pink/50 bg-brand-pink/10 px-3.5 py-1.5 text-xs text-brand-roseGold transition-all hover:bg-brand-pink/20 sm:inline-flex"
            >
              <MessageCircle className="h-4 w-4 text-brand-pink" />
              <span>{lineLabel(lineUrl)}</span>
            </a>
          </div>
        </header>

        <main className="relative z-[1] mx-auto my-auto w-full max-w-4xl px-4 py-6">{children}</main>

        <footer className="relative z-[1] border-t border-brand-border bg-brand-black py-5 text-center text-xs text-gray-500">
          <div className="mx-auto max-w-4xl px-4">
            <p className="font-kanit">© อาจารย์ขวัญ | The Mastermind. All Rights Reserved.</p>
            <p className="mt-1 text-[10px] font-light text-gray-500">
              แบบประเมินนี้ใช้เพื่อการวิเคราะห์เบื้องต้นด้วยหลักจิตวิทยาพฤติกรรมมนุษย์และการบริหารความสัมพันธ์เชิงยุทธศาสตร์
              ไม่ใช่การวินิจฉัยทางการแพทย์
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
