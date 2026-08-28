// Server-rendered SVG charts for the Ledger. No chart library: the JS
// budget is 150KB and these are static shapes with native <title> hover.
// Built to the dataviz skill's rules: thin marks, recessive grid, one axis,
// direct labels on multi-series lines plus a legend, text in text tokens
// (never the series color for values), and every chart ships with a table
// twin in a <details> beside it on the page.
//
// Series palette validated 2026-08-28 with the skill's validator against
// the panel surface (#1A2029), dark mode: all six checks pass.
//   QB #C93F92 · RB #7AA61A · WR #3595C9 · TE #BD7722
// Assignment is fixed order, never cycled.

const W = 640;
const H = 260;
const PAD = { top: 16, right: 88, bottom: 28, left: 44 };

export const SERIES_COLORS: Record<string, string> = {
  QB: "#C93F92",
  RB: "#7AA61A",
  WR: "#3595C9",
  TE: "#BD7722",
};

interface Series {
  name: string;
  color: string;
  points: { x: number; y: number; label: string }[];
}

function scales(allX: number[], allY: number[]) {
  const x0 = Math.min(...allX);
  const x1 = Math.max(...allX);
  const yMax = Math.max(...allY) * 1.08;
  const yMin = Math.min(0, Math.min(...allY));
  const sx = (v: number) =>
    PAD.left + ((v - x0) / (x1 - x0 || 1)) * (W - PAD.left - PAD.right);
  const sy = (v: number) =>
    H - PAD.bottom - ((v - yMin) / (yMax - yMin || 1)) * (H - PAD.top - PAD.bottom);
  return { x0, x1, yMax, yMin, sx, sy };
}

export function LineChart({
  series,
  title,
  yTickFormat = (v) => String(Math.round(v)),
}: {
  series: Series[];
  title: string;
  yTickFormat?: (v: number) => string;
}) {
  const allX = series.flatMap((s) => s.points.map((p) => p.x));
  const allY = series.flatMap((s) => s.points.map((p) => p.y));
  const { x0, x1, yMax, yMin, sx, sy } = scales(allX, allY);
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];
  const xTicks = [x0, Math.round((x0 + x1) / 2), x1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={title}
      className="w-full h-auto"
    >
      {/* recessive grid: horizontal only, edge-token hairlines */}
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={sy(t)}
            y2={sy(t)}
            stroke="var(--color-edge)"
            strokeWidth="1"
          />
          <text
            x={PAD.left - 6}
            y={sy(t) + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--color-steel)"
          >
            {yTickFormat(t)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text
          key={t}
          x={sx(t)}
          y={H - 8}
          textAnchor="middle"
          fontSize="11"
          fill="var(--color-steel)"
        >
          {t}
        </text>
      ))}
      {series.map((s) => (
        <g key={s.name}>
          <path
            d={s.points
              .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
              .join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {s.points.map((p) => (
            <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r="7" fill="transparent">
              <title>{p.label}</title>
            </circle>
          ))}
          {/* direct label at the line's end; identity never color-alone */}
          <text
            x={W - PAD.right + 8}
            y={sy(s.points[s.points.length - 1].y) + 4}
            fontSize="12"
            fill="var(--color-ice)"
          >
            {s.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function DivergingBars({
  rows,
  title,
  format = (v) => (v > 0 ? `+${v}` : String(v)),
}: {
  rows: { name: string; value: number; note?: string }[];
  title: string;
  format?: (v: number) => string;
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value))) || 1;
  const rowH = 30;
  const h = rows.length * rowH + 8;
  const mid = W / 2 + 40;
  const span = (W - PAD.right) / 2 - 80;
  return (
    <svg
      viewBox={`0 0 ${W} ${h}`}
      width={W}
      height={h}
      role="img"
      aria-label={title}
      className="w-full h-auto"
    >
      <line x1={mid} x2={mid} y1={0} y2={h} stroke="var(--color-edge)" strokeWidth="1" />
      {rows.map((r, i) => {
        const y = i * rowH + 6;
        const w = (Math.abs(r.value) / max) * span;
        const pos = r.value >= 0;
        return (
          <g key={r.name}>
            <text x={4} y={y + 13} fontSize="12" fill="var(--color-ice)">
              {r.name}
            </text>
            <rect
              x={pos ? mid : mid - w}
              y={y}
              width={Math.max(w, 1)}
              height={18}
              rx="3"
              fill={pos ? "var(--color-win)" : "var(--color-loss)"}
            >
              <title>{`${r.name}: ${format(r.value)}${r.note ? ` (${r.note})` : ""}`}</title>
            </rect>
            <text
              x={pos ? mid + w + 6 : mid - w - 6}
              y={y + 13}
              textAnchor={pos ? "start" : "end"}
              fontSize="11"
              fill="var(--color-steel)"
            >
              {format(r.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Bars({
  rows,
  title,
  format = (v) => v.toLocaleString("en-US"),
}: {
  rows: { name: string; value: number }[];
  title: string;
  format?: (v: number) => string;
}) {
  const max = Math.max(...rows.map((r) => r.value)) || 1;
  const rowH = 30;
  const h = rows.length * rowH + 8;
  const labelW = 150;
  const span = W - labelW - 90;
  return (
    <svg
      viewBox={`0 0 ${W} ${h}`}
      width={W}
      height={h}
      role="img"
      aria-label={title}
      className="w-full h-auto"
    >
      {rows.map((r, i) => {
        const y = i * rowH + 6;
        const w = (r.value / max) * span;
        return (
          <g key={r.name}>
            <text x={labelW - 8} y={y + 13} textAnchor="end" fontSize="12" fill="var(--color-ice)">
              {r.name}
            </text>
            <rect x={labelW} y={y} width={Math.max(w, 2)} height={18} rx="3" fill="var(--color-volt)">
              <title>{`${r.name}: ${format(r.value)}`}</title>
            </rect>
            <text x={labelW + w + 6} y={y + 13} fontSize="11" fill="var(--color-steel)">
              {format(r.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
