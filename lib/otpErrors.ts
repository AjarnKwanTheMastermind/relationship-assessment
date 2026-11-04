// Why a one-time password could not be issued. Plain text, so client components can show it too.
export type OtpError = "noemail" | "noprovider" | "rate" | "send";

export const otpErrors: Record<OtpError, string> = {
  noemail: "เปิดใช้การยืนยันตัวตนสองขั้นตอน แต่ยังไม่ได้ตั้งค่า ADMIN_EMAIL (อีเมลผู้ดูแล) จึงส่งรหัส OTP ไม่ได้ การตั้งค่ายังไม่เปลี่ยน",
  noprovider:
    "เปิดใช้การยืนยันตัวตนสองขั้นตอน แต่ยังไม่ได้ตั้งค่าบริการส่งอีเมล (RESEND_API_KEY และ EMAIL_FROM) จึงส่งรหัส OTP ไม่ได้ การตั้งค่ายังไม่เปลี่ยน",
  rate: "ขอรหัสบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่ การตั้งค่ายังไม่เปลี่ยน",
  send: "ส่งอีเมลไม่สำเร็จ การตั้งค่ายังไม่เปลี่ยน กรุณาลองใหม่อีกครั้ง",
};

export const isOtpError = (value: string): value is OtpError => Object.prototype.hasOwnProperty.call(otpErrors, value);
