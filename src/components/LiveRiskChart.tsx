import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { PARAMS } from "@/lib/reactor";

interface DataPoint {
  n: number;
  R: number;
  C: number;
  D: number;
  state: string;
}

interface Props {
  history: DataPoint[];
}

const STATE_DOT: Record<string, string> = {
  OPEN: "#00FF41",
  BACKOFF: "#FFB800",
  QUARANTINE: "#FF7700",
  SCRAM_LOCK: "#FF3131",
  CONTAINMENT_LOCK: "#FF0000",
  TAMPER_EVIDENT: "#FF3131",
};

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: DataPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  const color = STATE_DOT[payload.state] ?? "#00FF41";
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="none" />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: DataPoint = payload[0].payload;
  const color = STATE_DOT[d.state] ?? "#00FF41";
  return (
    <div className="bg-reactor-panel border border-reactor-line p-3 font-mono text-[11px] space-y-1">
      <p className="text-stone-500">attempt n={d.n}</p>
      <p style={{ color }}>state: {d.state}</p>
      <p className="text-white">R(n) = {d.R.toFixed(3)}</p>
    </div>
  );
}

export function LiveRiskChart({ history }: Props) {
  if (history.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-stone-600 font-mono text-xs">
        No attempts yet — run a simulation
      </div>
    );
  }

  const maxR = Math.max(...history.map((h) => h.R), PARAMS.T4 + 0.5);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={history} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 5" />
          <XAxis
            dataKey="n"
            tick={{ fill: "#6b6b70", fontSize: 9, fontFamily: "Space Mono" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, maxR]}
            tick={{ fill: "#6b6b70", fontSize: 9, fontFamily: "Space Mono" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Threshold lines */}
          <ReferenceLine y={PARAMS.T1} stroke="#FFB800" strokeDasharray="4 3" strokeOpacity={0.4}
            label={{ value: "T₁", position: "right", fill: "#FFB800", fontSize: 8, fontFamily: "Space Mono" }} />
          <ReferenceLine y={PARAMS.T2} stroke="#FF7700" strokeDasharray="4 3" strokeOpacity={0.4}
            label={{ value: "T₂", position: "right", fill: "#FF7700", fontSize: 8, fontFamily: "Space Mono" }} />
          <ReferenceLine y={PARAMS.T3} stroke="#FF3131" strokeDasharray="4 3" strokeOpacity={0.5}
            label={{ value: "T₃", position: "right", fill: "#FF3131", fontSize: 8, fontFamily: "Space Mono" }} />
          <ReferenceLine y={PARAMS.T4} stroke="#FF0000" strokeDasharray="4 3" strokeOpacity={0.6}
            label={{ value: "T₄", position: "right", fill: "#FF0000", fontSize: 8, fontFamily: "Space Mono" }} />
          <Line
            type="monotone"
            dataKey="R"
            stroke="#00FF41"
            strokeWidth={2}
            dot={<CustomDot />}
            isAnimationActive
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-[9px] font-mono text-stone-500 flex-wrap">
        {[["T₁", "BACKOFF", "#FFB800"], ["T₂", "QUARANTINE", "#FF7700"], ["T₃", "SCRAM", "#FF3131"], ["T₄", "CONTAINMENT", "#FF0000"]].map(([t, label, color]) => (
          <span key={t} className="flex items-center gap-1">
            <span className="size-2 rounded-sm" style={{ background: color }} />
            {t} {label}
          </span>
        ))}
      </div>
    </div>
  );
}
