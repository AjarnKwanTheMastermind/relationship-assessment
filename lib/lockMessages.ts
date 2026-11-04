// Messages for a wrong administrator password and for the lock after too many of them.
// Plain functions with no server code, so the course form (a client component) can use them too.
export function wrongPasswordMessage(left?: number): string {
  return left !== undefined && Number.isInteger(left) && left >= 0
    ? `รหัสผ่านผู้ดูแลไม่ถูกต้อง เหลืออีก ${left} ครั้ง การตั้งค่ายังไม่เปลี่ยน`
    : "รหัสผ่านผู้ดูแลไม่ถูกต้อง การตั้งค่ายังไม่เปลี่ยน";
}

// untilMs is the moment the lock ends, in milliseconds since 1970.
export function lockedMessage(untilMs?: number): string {
  const valid = untilMs !== undefined && Number.isFinite(untilMs) && untilMs > 0;
  const time = valid
    ? new Date(untilMs).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })
    : null;
  return `ล็อกการบันทึกชั่วคราว เพราะกรอกรหัสผ่านผู้ดูแลผิดเกินกำหนด ${
    time ? `ลองใหม่ได้หลังเวลา ${time} น.` : "กรุณารอสักครู่แล้วลองใหม่"
  } การตั้งค่ายังไม่เปลี่ยน`;
}
