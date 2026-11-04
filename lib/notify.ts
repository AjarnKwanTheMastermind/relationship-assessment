// Email to the administrator: the one-time password that approves a change (when TWO_FACTOR_AUTHEN is on) and
// the warning sent after every change. The address comes from the ADMIN_EMAIL environment variable
// only: if the settings page could edit it, someone who stole the backoffice password could point the
// codes and warnings at themselves. A warning never blocks or undoes a save; the settings page tells
// the administrator how it went.
import { headers } from "next/headers";
import type { CourseField, CourseValues } from "./courseEdit";

export type Change = { label: string; before: string; after: string };
export type ChangeEvent = { subject: string; action: "save" | "reset"; changes: Change[] };

// sent: delivered to the email service. failed: configured but the service refused or was unreachable.
// off: not configured, so nothing was tried.
export type MailStatus = "sent" | "failed" | "off";

export const mailStatuses: MailStatus[] = ["sent", "failed", "off"];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function adminEmail(): string | null {
  const value = process.env.ADMIN_EMAIL?.trim();
  return value && EMAIL.test(value) ? value : null;
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}***@${domain}`;
}

export function notificationsConfigured(): boolean {
  return Boolean(adminEmail() && process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

// email: sent through Resend. console: development only, nothing is sent and the code is shown on the
// verification page. unavailable: fail closed.
export type DeliveryMode = "email" | "console" | "unavailable";

export function deliveryMode(): DeliveryMode {
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return "email";
  return process.env.NODE_ENV === "development" ? "console" : "unavailable";
}

const courseLabels: Record<CourseField, string> = {
  title: "ชื่อคอร์ส (title)",
  titleEn: "ชื่อภาษาอังกฤษ (english title)",
  price: "ราคา (price)",
  fullPrice: "ราคาเต็ม (full price)",
  priceNote: "หมายเหตุราคา (price note)",
  summary: "สรุปคอร์ส (summary)",
  details: "รายละเอียดคอร์ส (details)",
  modules: "เนื้อหาในคอร์ส (modules)",
  benefits: "สิทธิพิเศษ (benefits)",
  suitable: "เหมาะกับใคร (suitable)",
};

// Only the fields whose text differs, so the email shows what actually changed.
export function diffCourse(courseTitle: string, before: CourseValues | null, after: CourseValues): Change[] {
  return (Object.keys(courseLabels) as CourseField[])
    .filter((field) => (before?.[field] ?? "") !== after[field])
    .map((field) => ({
      label: `คอร์ส "${courseTitle}" – ${courseLabels[field]}`,
      before: before ? before[field] : "(ไม่ทราบ)",
      after: after[field],
    }));
}

const MAX_VALUE = 200;

// One short line per value: lists become "a / b", long text is cut, control characters are dropped.
export function show(value: string): string {
  const line = value
    .replace(/[\u0000-\u001f\u007f‪-‮⁦-⁩]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!line) return "(ว่าง)";
  return line.length > MAX_VALUE ? `${line.slice(0, MAX_VALUE)}… (ตัดข้อความ ยาวทั้งหมด ${line.length} ตัวอักษร)` : line;
}

function header(name: string): string {
  return (headers().get(name) ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 200);
}

// Who made the request, for the email only: nothing here is stored.
function requester() {
  const ip = header("x-nf-client-connection-ip") || header("x-forwarded-for").split(",")[0].trim() || "ไม่ทราบ";
  return { ip, agent: header("user-agent") || "ไม่ทราบ", host: header("host") };
}

function bangkokTime(date: Date): string {
  // sv-SE prints "2026-11-03 07:42:10"; the Thai locale would print a Buddhist-era year.
  return `${date.toLocaleString("sv-SE", { timeZone: "Asia/Bangkok" })} (เวลาประเทศไทย UTC+7)`;
}

function siteAddress(host: string): string {
  return process.env.URL || (host ? `https://${host}` : "(ไม่ทราบ)");
}

function changeLines(changes: Change[]): string[] {
  if (changes.length === 0) return ["- ไม่มีค่าใดเปลี่ยน (บันทึกซ้ำด้วยค่าเดิม)"];
  return changes.flatMap((change) => [`- ${change.label}`, `    ก่อน: ${show(change.before)}`, `    หลัง: ${show(change.after)}`]);
}

export function buildMessage(event: ChangeEvent, at: Date = new Date()) {
  const who = requester();
  const lines = [
    `มีการเปลี่ยนแปลงการตั้งค่าของเว็บไซต์ ${siteAddress(who.host)}`,
    "",
    `เวลาที่เกิดเหตุการณ์: ${bangkokTime(at)}`,
    `เวลาสากล (UTC): ${at.toISOString()}`,
    `การกระทำ: ${event.action === "reset" ? "คืนค่าเริ่มต้น" : "บันทึกการแก้ไข"}`,
    "",
    "การตั้งค่าที่เปลี่ยน:",
    ...changeLines(event.changes),
    "",
    "ข้อมูลของคำขอ (ใช้ประกอบการตรวจสอบ ระบบไม่ได้เก็บข้อมูลนี้ไว้):",
    `- ที่อยู่ IP: ${who.ip}`,
    `- เบราว์เซอร์: ${who.agent}`,
    "",
    "⚠ คำเตือน",
    "ถ้าคุณไม่ได้เป็นผู้เปลี่ยนการตั้งค่านี้ แสดงว่าเว็บไซต์อาจถูกโจมตีหรือถูกแฮก (มีคนรู้รหัสผ่านผู้ดูแล)",
    "ให้ปิดเว็บไซต์ชั่วคราวและตรวจสอบทันที:",
    "1. ใน Netlify ไปที่ Project configuration > Environment variables เพิ่ม MAINTENANCE_MODE=on แล้ว Deploy เพื่อปิดเว็บไซต์ (หน้าแบบประเมินจะแสดงหน้าปิดปรับปรุง)",
    "2. เปลี่ยน ADMIN_PASSWORD เป็นรหัสผ่านใหม่ที่คาดเดายาก แล้ว Deploy",
    "3. คืนค่าที่ถูกเปลี่ยนในหน้า ตั้งค่าระบบ ของ backoffice (ตรวจลิงก์ LINE และข้อมูลคอร์สทุกคอร์ส)",
    "4. ตรวจประวัติใน Netlify (Deploys และ Logs) และ Neon (Monitoring) ว่ามีการเข้าถึงที่ไม่คุ้นเคยหรือไม่",
    "5. เมื่อแน่ใจว่าปลอดภัย ลบ MAINTENANCE_MODE แล้ว Deploy เพื่อเปิดเว็บไซต์อีกครั้ง",
    "",
    "ถ้าคุณเป็นผู้เปลี่ยนเอง ไม่ต้องทำอะไรเพิ่ม",
    "อีเมลนี้ส่งอัตโนมัติ กรุณาอย่าตอบกลับ",
  ];
  return { subject: `[แจ้งเตือน] ${event.subject} ถูกเปลี่ยน – ${at.toISOString().slice(0, 16).replace("T", " ")} UTC`, text: lines.join("\n") };
}

export function buildOtpMessage(code: string, subject: string, changes: Change[], ttlMinutes: number) {
  const who = requester();
  const lines = [
    `รหัสยืนยัน (OTP): ${code}`,
    "",
    `ใช้ยืนยันการเปลี่ยนการตั้งค่าของเว็บไซต์ ${siteAddress(who.host)}`,
    `รหัสใช้ได้ครั้งเดียวและหมดอายุใน ${ttlMinutes} นาที`,
    "",
    `การเปลี่ยนแปลงที่ขอ: ${subject}`,
    ...changeLines(changes),
    "",
    `ที่อยู่ IP ของผู้ขอ: ${who.ip}`,
    "",
    "⚠ ถ้าคุณไม่ได้เป็นผู้ขอ อย่าบอกรหัสนี้กับใคร และอย่าทำตามที่ใครขอ",
    "มีคนที่รู้รหัสผ่านผู้ดูแลกำลังพยายามแก้ไขการตั้งค่า ควรเปลี่ยน ADMIN_PASSWORD ใน Netlify ทันที แล้ว Deploy",
    "รหัสนี้ไม่มีผลถ้าไม่มีใครกรอก และจะหมดอายุเอง",
  ];
  return { subject: `รหัสยืนยัน (OTP) ${code} สำหรับแก้ไขการตั้งค่า`, text: lines.join("\n") };
}

// One HTTPS request to Resend. True only if Resend accepted the message.
export async function sendAdminEmail(subject: string, text: string): Promise<boolean> {
  const to = adminEmail();
  if (!to || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return false;
  try {
    const response = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) console.error(`Email service answered ${response.status}`);
    return response.ok;
  } catch (error) {
    console.error("Could not reach the email service", error instanceof Error ? error.message : error);
    return false;
  }
}

export async function sendOtpEmail(code: string, subject: string, changes: Change[], ttlMinutes: number): Promise<boolean> {
  if (deliveryMode() === "console") {
    // Development only: nothing is emailed, and the code is shown on the verification page.
    console.log(`[dev] OTP for ${subject}: ${code}`);
    return true;
  }
  const message = buildOtpMessage(code, subject, changes, ttlMinutes);
  return sendAdminEmail(message.subject, message.text);
}

export async function notifySettingsChanged(event: ChangeEvent): Promise<MailStatus> {
  if (!notificationsConfigured()) return "off";
  const message = buildMessage(event);
  return (await sendAdminEmail(message.subject, message.text)) ? "sent" : "failed";
}
