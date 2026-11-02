import { helplines } from "./helplines";

// Maintenance mode closes the public site. It is switched with the MAINTENANCE_MODE environment
// variable ("on"); anything else, or no value, leaves the site open.
export function maintenanceOn(value: string | undefined): boolean {
  return ["on", "true", "1"].includes((value ?? "").trim().toLowerCase());
}

// A plain page with no scripts or external files, so it can't fail when the rest of the site does.
// It lists the helplines, because someone in danger may arrive here.
export const maintenanceHtml = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>ปิดปรับปรุงชั่วคราว | อาจารย์ขวัญ The Mastermind</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0c;color:#e5e7eb;font-family:system-ui,"Noto Sans Thai",Tahoma,sans-serif;padding:16px}
  main{max-width:34rem;width:100%;border:1px solid #2a2a33;border-radius:24px;background:#121217;padding:32px 24px;text-align:center}
  h1{font-size:1.5rem;margin:0 0 12px;color:#fff}
  p{line-height:1.7;margin:0 0 12px;color:#cbd5e1}
  .help{margin-top:24px;border-top:1px solid #2a2a33;padding-top:20px;text-align:left}
  .help h2{font-size:1rem;margin:0 0 10px;color:#ff6fa8}
  ul{list-style:none;margin:0;padding:0}
  li{display:flex;gap:12px;align-items:baseline;padding:6px 0}
  li strong{font-size:1.25rem;color:#fff;min-width:3.5rem}
</style>
</head>
<body>
<main>
  <h1>ขออภัย ขณะนี้ระบบปิดปรับปรุงชั่วคราว</h1>
  <p>เรากำลังปรับปรุงระบบและจะกลับมาให้บริการโดยเร็วที่สุด กรุณากลับมาใหม่อีกครั้งภายหลัง</p>
  <div class="help">
    <h2>หากคุณไม่ปลอดภัยหรือต้องการความช่วยเหลือทันที โปรดติดต่อ</h2>
    <ul>
${helplines.map(({ number, name }) => `      <li><strong>${number}</strong><span>${name}</span></li>`).join("\n")}
    </ul>
  </div>
</main>
</body>
</html>`;
