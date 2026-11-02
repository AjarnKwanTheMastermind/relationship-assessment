// Sends the one-time password to the administrator. The address comes from the ADMIN_EMAIL
// environment variable only: if the settings page could change it, someone who stole the
// backoffice password could redirect the codes to themselves.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function adminEmail(): string | null {
  const value = process.env.ADMIN_EMAIL?.trim();
  return value && EMAIL.test(value) ? value : null;
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}***@${domain}`;
}

// email: sent through Resend. console: development only, nothing is sent. unavailable: fail closed.
export type DeliveryMode = "email" | "console" | "unavailable";

export function deliveryMode(): DeliveryMode {
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return "email";
  return process.env.NODE_ENV === "development" ? "console" : "unavailable";
}

export async function sendOtpEmail(to: string, code: string, summary: string, minutes: number): Promise<boolean> {
  const mode = deliveryMode();
  if (mode === "console") {
    console.log(`[dev] OTP for ${to}: ${code} (${summary})`);
    return true;
  }
  if (mode === "unavailable") return false;

  const text = [
    `รหัสยืนยัน (OTP): ${code}`,
    "",
    `การเปลี่ยนแปลงที่ขอ: ${summary}`,
    `รหัสใช้ได้ครั้งเดียวและหมดอายุใน ${minutes} นาที`,
    "",
    "ถ้าคุณไม่ได้เป็นผู้ขอ อย่าบอกรหัสนี้กับใคร และควรเปลี่ยนรหัสผ่านของ backoffice ทันที",
  ].join("\n");

  try {
    const response = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject: `รหัสยืนยัน (OTP) ${code} สำหรับแก้ไขการตั้งค่า`,
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error(`Email service answered ${response.status}`);
    return response.ok;
  } catch (error) {
    console.error("Could not reach the email service", error instanceof Error ? error.message : error);
    return false;
  }
}
