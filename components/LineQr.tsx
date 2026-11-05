import qrcode from "qrcode-generator";

// A QR code for the LINE link, drawn as inline SVG on the server: no outside QR service, no script, and
// nothing about the visitor leaves the site. It is always black on white with a four-module quiet zone,
// whatever the page colours, because phone cameras need that contrast to read it.
const QUIET_ZONE = 4;

export default function LineQr({ url, className }: { url: string; className?: string }) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const count = qr.getModuleCount();
  const size = count + QUIET_ZONE * 2;

  // One path for every dark module, merged into horizontal runs to keep the markup small.
  let path = "";
  for (let row = 0; row < count; row++) {
    let col = 0;
    while (col < count) {
      if (!qr.isDark(row, col)) {
        col++;
        continue;
      }
      const start = col;
      while (col < count && qr.isDark(row, col)) col++;
      path += `M${start + QUIET_ZONE} ${row + QUIET_ZONE}h${col - start}v1h-${col - start}z`;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="QR Code สำหรับเปิดลิงก์ LINE ของอาจารย์ขวัญ"
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
