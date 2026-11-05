// Why a one-time password could not be issued. Plain text, so client components can show it too. It never names
// an environment variable: this file is part of the script every visitor downloads.
export type OtpError = "noemail" | "noprovider" | "rate" | "send";

export const otpErrors: Record<OtpError, string> = {
  noemail: "เปิดใช้การยืนยันตัวตนสองขั้นตอน แต่ยังไม่ได้ตั้งค่าอีเมลผู้ดูแล จึงส่งรหัส OTP ไม่ได้ (ดูวิธีตั้งค่าในคู่มือผู้ดูแลระบบ) การตั้งค่ายังไม่เปลี่ยน",
  noprovider:
    "เปิดใช้การยืนยันตัวตนสองขั้นตอน แต่ยังไม่ได้ตั้งค่าบริการส่งอีเมล จึงส่งรหัส OTP ไม่ได้ (ดูวิธีตั้งค่าในคู่มือผู้ดูแลระบบ) การตั้งค่ายังไม่เปลี่ยน",
  rate: "ขอรหัสบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่ การตั้งค่ายังไม่เปลี่ยน",
  send: "ส่งอีเมลไม่สำเร็จ การตั้งค่ายังไม่เปลี่ยน กรุณาลองใหม่อีกครั้ง",
};

export const isOtpError = (value: string): value is OtpError => Object.prototype.hasOwnProperty.call(otpErrors, value);
