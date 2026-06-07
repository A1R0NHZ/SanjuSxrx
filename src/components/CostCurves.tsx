import { useMemo } from "react";
import { compute, PARAMS, fmt, type Telemetry } from "@/lib/reactor";

interface Props {
  current: Telemetry;
  maxN?: number;
}

// Self-contained, dependency-free SVG line chart for cost curves.
export function CostCurves({ current, maxN = 10 }: Props) {
  const series = useMemo(() => {
    const points = Array.from({ length: maxN + 1 }, (_, n) => compute(n));
    return points;
  }, [maxN]);

  const w = 560;
  const h = 240;
  const pad = { l: 38, r: 12, t: 14, b: 24 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;

  const xs = (n: number) => pad.l + (n / maxN) * iw;
  // Normalize each metric to [0,1] by max in series.
  const norm = (vals: number[]) => {
    const m = Math.max(...vals, 1);
    return vals.map((v) => v / m);
  };

  const lines = [
    {
      key: "C",
      label: "C(n) cost",
      color: "var(--color-reactor-glow)",
      vals: norm(series.map((s) => s.C)),
    },
    {
      key: "M",
      label: "M(n) mem",
      color: "#7dd3fc",
      vals: norm(series.map((s) => s.M)),
    },
    {
      key: "D",
      label: "D(n) delay",
      color: "var(--color-reactor-warn)",
      vals: norm(series.map((s) => s.D)),
    },
    {
      key: "R",
      label: "R(n) risk",
      color: "var(--color-reactor-danger)",
      vals: norm(series.map((s) => s.R)),
    },
  ];

  const path = (vals: number[]) =>
    vals
      .map((v, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(2)},${(pad.t + ih - v * ih).toFixed(2)}`)
      .join(" ");

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        {/* grid */}
        {Array.from({ length: 5 }, (_, i) => {
          const y = pad.t + (i / 4) * ih;
          return (
            <line
              key={i}
              x1={pad.l}
              x2={w - pad.r}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="2 4"
            />
          );
        })}
        {Array.from({ length: maxN + 1 }, (_, i) => (
          <text
            key={i}
            x={xs(i)}
            y={h - 6}
            fontSize={9}
            fill="#6b6b70"
            textAnchor="middle"
            fontFamily="Space Mono"
          >
            {i}
          </text>
        ))}
        {/* current attempt marker */}
        <line
          x1={xs(current.n)}
          x2={xs(current.n)}
          y1={pad.t}
          y2={pad.t + ih}
          stroke="var(--color-reactor-glow)"
          strokeOpacity={0.35}
          strokeDasharray="3 3"
        />
        {lines.map((ln) => (
          <path
            key={ln.key}
            d={path(ln.vals)}
            fill="none"
            stroke={ln.color}
            strokeWidth={1.5}
          />
        ))}
        {/* current dots */}
        {lines.map((ln) => (
          <circle
            key={ln.key}
            cx={xs(current.n)}
            cy={pad.t + ih - ln.vals[current.n] * ih}
            r={3}
            fill={ln.color}
          />
        ))}
        <text
          x={pad.l}
          y={pad.t - 2}
          fontSize={9}
          fill="#6b6b70"
          fontFamily="Space Mono"
        >
          NORMALIZED
        </text>
      </svg>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
        {lines.map((ln) => (
          <div key={ln.key} className="flex items-center gap-2">
            <span className="size-2" style={{ background: ln.color }} />
            <span className="text-stone-400 uppercase">{ln.label}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-2 border-t border-reactor-line">
        <span className="text-stone-500">
          α={PARAMS.alpha} β={PARAMS.beta}
        </span>
        <span className="text-stone-500">
          M_max={fmt(PARAMS.Mmax)} MiB
        </span>
        <span className="text-stone-500">
          D_max={fmt(PARAMS.Dmax)} ms
        </span>
      </div>
    </div>
  );
}
