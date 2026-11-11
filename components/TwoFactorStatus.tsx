import { adminEmail, deliveryMode, maskEmail } from "@/lib/notify";
import { twoFactorOn } from "@/lib/twoFactor";

// Whether saving needs the administrator password or an emailed code. It is shown on the settings pages that
// save something, and it can only be changed in the environment, never from here.
export default function TwoFactorStatus() {
  const twoFactor = twoFactorOn();
  const email = adminEmail();
  const canSendCode = Boolean(email) && deliveryMode() !== "unavailable";

  return (
    <section className="glass-card rounded-2xl p-4 text-xs text-gray-300 sm:p-5">
      <h2 className="mb-1 text-sm font-medium text-white">
        การยืนยันตัวตนสองขั้นตอน (2FA){" "}
        <span className={twoFactor ? "text-emerald-300" : "text-gray-400"}>{twoFactor ? "· เปิดใช้งาน" : "· ปิดใช้งาน"}</span>
      </h2>
      <p className="font-light text-gray-400">
        {twoFactor
          ? `ทุกครั้งที่บันทึก ระบบจะส่งรหัส OTP 6 หลักไปที่อีเมลผู้ดูแล${email ? ` (${maskEmail(email)})` : ""} และการตั้งค่าจะเปลี่ยนเมื่อกรอกรหัสถูกต้องเท่านั้น`
          : "ทุกครั้งที่บันทึก ต้องกรอกรหัสผ่านผู้ดูแลอีกครั้ง"}
      </p>
      <p className="mt-2 font-light text-gray-500">
        เปิดหรือปิดได้ที่ตัวแปร TWO_FACTOR_AUTHEN ใน Netlify (ตั้งค่าเป็น on เพื่อเปิด หรือลบตัวแปรเพื่อปิด) แล้ว Deploy ใหม่ ไม่สามารถเปลี่ยนจากหน้านี้ได้
      </p>
      {twoFactor && !canSendCode && (
        <p role="alert" className="error-box mt-3">
          เปิด 2FA อยู่ แต่ยังตั้งค่า ADMIN_EMAIL, RESEND_API_KEY หรือ EMAIL_FROM ไม่ครบ จึงบันทึกการตั้งค่าไม่ได้จนกว่าจะตั้งค่าครบ หรือลบตัวแปร TWO_FACTOR_AUTHEN แล้ว Deploy ใหม่
        </p>
      )}
    </section>
  );
}
