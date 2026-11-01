import { formatPercent, optionColors, type OptionStat } from "@/lib/stats";

const SIZE = 180;
const CENTER = SIZE / 2;
const RADIUS = 86;
const SURFACE = "#12121a";

function point(fraction: number) {
  const angle = 2 * Math.PI * fraction - Math.PI / 2;
  return `${(CENTER + RADIUS * Math.cos(angle)).toFixed(2)} ${(CENTER + RADIUS * Math.sin(angle)).toFixed(2)}`;
}

function slicePath(start: number, end: number) {
  const largeArc = end - start > 0.5 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${point(start)} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${point(end)} Z`;
}

export default function PieChart({ options, label }: { options: OptionStat[]; label: string }) {
  const summary = options.map((o) => formatPercent(o.percent)).join(", ");
  let cumulative = 0;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`${label}: ${summary}`}
      className="mx-auto h-44 w-44"
    >
      {options.map((o) => {
        const start = cumulative;
        cumulative += o.percent / 100;
        const title = <title>{`${o.text}: ${o.picks.toLocaleString("en-US")} (${formatPercent(o.percent)})`}</title>;
        if (o.picks === 0) return null;
        // An arc cannot start and end on the same point, so a 100% answer is a circle.
        if (o.percent === 100) {
          return (
            <circle key={o.index} cx={CENTER} cy={CENTER} r={RADIUS} fill={optionColors[o.index]}>
              {title}
            </circle>
          );
        }
        return (
          <path
            key={o.index}
            d={slicePath(start, cumulative)}
            fill={optionColors[o.index]}
            stroke={SURFACE}
            strokeWidth="2"
            strokeLinejoin="round"
          >
            {title}
          </path>
        );
      })}
    </svg>
  );
}
