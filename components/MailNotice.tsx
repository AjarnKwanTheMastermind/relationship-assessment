import { mailStatuses, type MailStatus } from "@/lib/notify";

const messages: Record<MailStatus, { text: string; tone: string }> = {
  sent: { text: "ส่งอีเมลแจ้งเตือนไปยังผู้ดูแลแล้ว", tone: "border-brand-pink/40 bg-brand-pink/10 text-brand-roseGold" },
  failed: {
    text: "บันทึกแล้ว แต่ส่งอีเมลแจ้งเตือนไม่สำเร็จ โปรดตรวจ RESEND_API_KEY และ EMAIL_FROM ใน Netlify",
    tone: "border-yellow-500/40 bg-yellow-950/20 text-yellow-200",
  },
  off: {
    text: "บันทึกแล้ว แต่ยังไม่ได้ตั้งค่าอีเมลแจ้งเตือน (ADMIN_EMAIL, RESEND_API_KEY, EMAIL_FROM) จึงไม่มีการส่งอีเมล",
    tone: "border-yellow-500/40 bg-yellow-950/20 text-yellow-200",
  },
};

// Shown after a successful save, so a missing or broken notification is never silent.
export default function MailNotice({ status }: { status?: string }) {
  const known = mailStatuses.find((s) => s === status);
  if (!known) return null;
  const { text, tone } = messages[known];
  return (
    <p role="status" className={`rounded-2xl border p-4 text-sm ${tone}`}>
      {text}
    </p>
  );
}
