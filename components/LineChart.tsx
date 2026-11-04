// A line chart of completed quizzes per day, drawn as plain SVG so no script or outside file is needed.
// Every day has an invisible hover area with a tooltip, and the page shows the same numbers as a table.
const WIDTH = 720;
const HEIGHT = 300;
const MARGIN = { left: 48, right: 32, top: 24, bottom: 44 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;
const MAX_X_LABELS = 7;
// With more days than this, dots would blur into the line, so only the highest day gets one.
const MAX_DOTS = 62;

const LINE = "#ff2a85";
const PEAK = "#d4af37";
const GRID = "#262636";

// Round tick steps (1, 2, 5, 10, 20, 50 ...) so the axis shows whole numbers only.
function niceStep(roughStep: number) {
  if (roughStep <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const fraction = roughStep / magnitude;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * magnitude;
}

export function axisFor(max: number) {
  const step = niceStep(max / 4);
  const top = Math.max(step * Math.ceil(max / step), step);
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return { top, ticks };
}

// Evenly spaced day positions to label, always ending on the last day.
export function labelPositions(n: number): number[] {
  if (n <= MAX_X_LABELS) return Array.from({ length: n }, (_, i) => i);
  const step = Math.ceil((n - 1) / (MAX_X_LABELS - 1));
  const positions: number[] = [];
  for (let i = 0; i < n; i += step) positions.push(i);
  const last = positions[positions.length - 1];
  if (last !== n - 1) {
    // A last label too close to the one before it would overlap, so it takes that one's place.
    if (n - 1 - last < step * 0.6) positions[positions.length - 1] = n - 1;
    else positions.push(n - 1);
  }
  return positions;
}

function xLabel(day: string, showYear: boolean) {
  const label = `${day.slice(8, 10)}/${day.slice(5, 7)}`;
  return showYear ? `${label}/${day.slice(2, 4)}` : label;
}

export default function LineChart({ days, values }: { days: string[]; values: number[] }) {
  const n = days.length;
  if (n === 0) return null;

  const max = Math.max(...values);
  const total = values.reduce((sum, v) => sum + v, 0);
  const peakIndex = values.indexOf(max);
  const { top, ticks } = axisFor(max);

  const x = (i: number) => (n === 1 ? MARGIN.left + PLOT_W / 2 : MARGIN.left + (PLOT_W * i) / (n - 1));
  const y = (v: number) => MARGIN.top + PLOT_H * (1 - v / top);
  const baseline = y(0);

  const points = values.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${x(n - 1).toFixed(1)} ${baseline} L ${x(0).toFixed(1)} ${baseline} Z`;

  const labelIndexes = labelPositions(n);
  const showYear = days[0].slice(0, 4) !== days[n - 1].slice(0, 4);
  const hoverWidth = PLOT_W / Math.max(n - 1, 1);

  const summary =
    `กราฟเส้นจำนวนครั้งที่ทำแบบประเมินจนจบรายวัน ${days[0]} ถึง ${days[n - 1]} รวม ${total.toLocaleString("en-US")} ครั้ง` +
    (max > 0 ? ` สูงสุด ${max.toLocaleString("en-US")} ครั้งในวันที่ ${days[peakIndex]}` : " ไม่มีข้อมูลในช่วงนี้");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary} className="h-auto w-full min-w-[520px]">
        <defs>
          <linearGradient id="usage-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE} stopOpacity="0.32" />
            <stop offset="100%" stopColor={LINE} stopOpacity="0" />
          </linearGradient>
        </defs>

        <text x={MARGIN.left} y={12} className="fill-gray-500" fontSize="11">
          จำนวนครั้ง
        </text>

        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth="1" />
            <text x={MARGIN.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-gray-400" fontSize="12">
              {tick.toLocaleString("en-US")}
            </text>
          </g>
        ))}

        {labelIndexes.map((i) => (
          <g key={days[i]}>
            <line x1={x(i)} x2={x(i)} y1={baseline} y2={baseline + 5} stroke={GRID} strokeWidth="1" />
            <text x={x(i)} y={baseline + 20} textAnchor="middle" className="fill-gray-400" fontSize="12">
              {xLabel(days[i], showYear)}
            </text>
          </g>
        ))}

        {n > 1 && <path d={areaPath} fill="url(#usage-area)" />}
        {n > 1 && <path d={linePath} fill="none" stroke={LINE} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />}

        {values.map((v, i) =>
          n <= MAX_DOTS && i !== peakIndex ? <circle key={days[i]} cx={x(i)} cy={y(v)} r="3" fill={LINE} /> : null,
        )}
        {max > 0 && <circle cx={x(peakIndex)} cy={y(max)} r="5" fill={PEAK} stroke="#12121a" strokeWidth="2" />}

        {values.map((v, i) => (
          <rect key={days[i]} x={x(i) - hoverWidth / 2} y={MARGIN.top} width={hoverWidth} height={PLOT_H} fill="transparent">
            <title>{`${days[i]}: ${v.toLocaleString("en-US")} ครั้ง`}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}
