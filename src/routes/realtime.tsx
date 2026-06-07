import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchEvents,
  fetchStats,
  type ReactorEvent,
  type EventStats,
} from "@/lib/api/events.functions";
import { stateClass } from "@/lib/reactor";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { PARAMS } from "@/lib/reactor";

export const Route = createFileRoute("/realtime")({
  head: () => ({
    meta: [
      { title: "Real-Time Feed — SxCryptRx" },
      {
        name: "description",
        content: "Live global reactor event feed from all visitors.",
      },
    ],
  }),
  component: RealtimePage,
});

// ── Colors ────────────────────────────────────────────────────────────────
const KIND_COLOR: Record<string, string> = {
  attempt:  "#6b6b70",
  tamper:   "#FF3131",
  decoy:    "#FFB800",
  zeroize:  "#FF3131",
  reset:    "#00FF41",
  info:     "#4a9eff",
};
const STATE_COLOR: Record<string, string> = {
  OPEN:             "#00FF41",
  BACKOFF:          "#FFB800",
  QUARANTINE:       "#FF7700",
  SCRAM_LOCK:       "#FF3131",
  CONTAINMENT_LOCK: "#FF0000",
  TAMPER_EVIDENT:   "#FF3131",
};

// ── Small helpers ─────────────────────────────────────────────────────────
function KindBadge({ kind }: { kind: string }) {
  const color = KIND_COLOR[kind] ?? "#6b6b70";
  return (
    <span
      className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 border shrink-0"
      style={{ borderColor: color + "55", color, background: color + "11" }}
    >
      {kind}
    </span>
  );
}

function StateBadge({ state }: { state: string }) {
  const c = stateClass(state as Parameters<typeof stateClass>[0]);
  return (
    <span
      className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 border shrink-0 ${c.border} ${c.text}`}
    >
      {state}
    </span>
  );
}

function age(ts: number) {
  const d = Date.now() - ts;
  if (d < 5_000) return "just now";
  if (d < 60_000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  return new Date(ts).toLocaleTimeString("en-GB");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-reactor-panel border border-reactor-line p-2 font-mono text-[11px] space-y-1">
      <p className="text-white">{d.kind ?? d.state}</p>
      <p className="text-reactor-glow">{d.cnt} events</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LineTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const e: ReactorEvent = payload[0].payload;
  return (
    <div className="bg-reactor-panel border border-reactor-line p-2 font-mono text-[11px] space-y-1">
      <p className="text-stone-500">#{e.id} · {age(e.ts)}</p>
      <p style={{ color: STATE_COLOR[e.state] ?? "#6b6b70" }}>{e.state}</p>
      <p className="text-white">R = {e.r_score.toFixed(3)}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
function RealtimePage() {
  const [events, setEvents] = useState<ReactorEvent[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [ticker, setTicker] = useState(0); // forces re-render for live age
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [evRes, stRes] = await Promise.all([
        fetchEvents({ data: { limit: 100 } }),
        fetchStats({ data: {} }),
      ]);
      setEvents(evRes.events);
      setStats(stRes);
      setStatus("idle");
      setErrorMsg("");
    } catch (e) {
      setStatus("error");
      setErrorMsg((e as Error).message ?? String(e));
    }
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 3 s (fallback)
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(load, 3000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, load]);

  // Re-render age strings every 5 s
  useEffect(() => {
    ageRef.current = setInterval(() => setTicker((n) => n + 1), 5000);
    return () => { if (ageRef.current) clearInterval(ageRef.current); };
  }, []);
  void ticker; // consumed by age() via Date.now()

  // Build time-series for the line chart (reverse so oldest first)
  const timeSeries = [...events].reverse().slice(-40);

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 space-y-10">

      {/* ── Header ── */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 px-2 py-1 border border-reactor-glow/30 bg-reactor-glow/5 text-reactor-glow text-[10px] font-mono">
          <span className={`size-1.5 rounded-full ${autoRefresh ? "bg-reactor-glow animate-pulse" : "bg-stone-600"}`} />
          GLOBAL FEED · LIVE · {autoRefresh ? "LIVE" : "PAUSED"}
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white font-mono italic uppercase leading-tight">
          Real-Time<br />Reactor Feed
        </h1>
        <p className="text-stone-400 text-sm max-w-2xl leading-relaxed">
          Every simulator and vault action from <em>all visitors</em> is persisted to a shared{" "}
          <span className="text-reactor-glow font-mono">Turso</span> database and
          polled here every 3 seconds. Watch the global reactor heat up in real time.
        </p>
      </header>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={load}
          disabled={status === "loading"}
          className="px-4 h-9 border border-reactor-glow/30 bg-reactor-glow/5 hover:bg-reactor-glow hover:text-black font-mono text-xs uppercase tracking-widest disabled:opacity-50 transition-all"
        >
          {status === "loading" ? "loading…" : "↻ refresh"}
        </button>

        {/* Auto-refresh toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`relative w-11 h-6 rounded-full border transition-all ${
              autoRefresh ? "bg-reactor-glow/20 border-reactor-glow" : "bg-black/40 border-reactor-line"
            }`}
            aria-label="Toggle auto-refresh"
          >
            <span className={`absolute top-1 size-4 rounded-full transition-all ${
              autoRefresh ? "left-6 bg-reactor-glow" : "left-1 bg-stone-600"
            }`} />
          </button>
          <span className="font-mono text-[11px] text-stone-500 select-none">
            {autoRefresh ? "live · 3s" : "paused"}
          </span>
        </div>

        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-stone-600">
          append-only audit feed
        </span>
      </div>

      {/* ── Error banner ── */}
      {status === "error" && (
        <div className="border border-reactor-danger/40 bg-reactor-danger/10 px-4 py-3 font-mono text-sm text-reactor-danger flex gap-3 items-start">
          <span className="shrink-0 font-bold">ERROR</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Stats cards ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={stats?.total.toLocaleString() ?? "—"} color="glow" />
        <StatCard
          label="Attempts"
          value={String(stats?.byKind.find((k) => k.kind === "attempt")?.cnt ?? 0)}
          color="muted"
        />
        <StatCard
          label="Tamper / Zeroize"
          value={String(
            (stats?.byKind.find((k) => k.kind === "tamper")?.cnt ?? 0) +
            (stats?.byKind.find((k) => k.kind === "zeroize")?.cnt ?? 0),
          )}
          color="danger"
        />
        <StatCard
          label="Resets"
          value={String(stats?.byKind.find((k) => k.kind === "reset")?.cnt ?? 0)}
          color="glow"
        />
      </div>

      {/* ── Charts row ── */}
      {stats && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* By kind */}
          <div className="panel p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500 mb-4">Events by Kind</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={stats.byKind} margin={{ top: 4, right: 8, left: -28, bottom: 4 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="kind" tick={{ fill: "#6b6b70", fontSize: 9, fontFamily: "Space Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b6b70", fontSize: 9, fontFamily: "Space Mono" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<BarTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="cnt" radius={[2, 2, 0, 0]}>
                  {stats.byKind.map((e) => (
                    <Cell key={e.kind} fill={KIND_COLOR[e.kind] ?? "#6b6b70"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* By state */}
          <div className="panel p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500 mb-4">Events by State</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={stats.byState} margin={{ top: 4, right: 8, left: -28, bottom: 4 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="state" tick={{ fill: "#6b6b70", fontSize: 7, fontFamily: "Space Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b6b70", fontSize: 9, fontFamily: "Space Mono" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<BarTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="cnt" radius={[2, 2, 0, 0]}>
                  {stats.byState.map((e) => (
                    <Cell key={e.state} fill={STATE_COLOR[e.state] ?? "#6b6b70"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── R(n) time-series ── */}
      {timeSeries.length > 1 && (
        <div className="panel p-5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500 mb-4">
            Global R(n) Over Time — last {timeSeries.length} events
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={timeSeries} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 5" />
              <XAxis dataKey="id" tick={{ fill: "#6b6b70", fontSize: 8, fontFamily: "Space Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b6b70", fontSize: 8, fontFamily: "Space Mono" }} axisLine={false} tickLine={false} />
              <Tooltip content={<LineTip />} />
              <ReferenceLine y={PARAMS.T1} stroke="#FFB800" strokeDasharray="3 3" strokeOpacity={0.4}
                label={{ value: "T₁", position: "right", fill: "#FFB800", fontSize: 8, fontFamily: "Space Mono" }} />
              <ReferenceLine y={PARAMS.T2} stroke="#FF7700" strokeDasharray="3 3" strokeOpacity={0.4}
                label={{ value: "T₂", position: "right", fill: "#FF7700", fontSize: 8, fontFamily: "Space Mono" }} />
              <ReferenceLine y={PARAMS.T3} stroke="#FF3131" strokeDasharray="3 3" strokeOpacity={0.5}
                label={{ value: "T₃", position: "right", fill: "#FF3131", fontSize: 8, fontFamily: "Space Mono" }} />
              <ReferenceLine y={PARAMS.T4} stroke="#FF0000" strokeDasharray="3 3" strokeOpacity={0.6}
                label={{ value: "T₄", position: "right", fill: "#FF0000", fontSize: 8, fontFamily: "Space Mono" }} />
              <Line
                type="monotone"
                dataKey="r_score"
                stroke="#00FF41"
                strokeWidth={2}
                dot={(p) => {
                  const color = STATE_COLOR[(p.payload as ReactorEvent).state] ?? "#00FF41";
                  return <circle key={p.key} cx={p.cx} cy={p.cy} r={3} fill={color} stroke="none" />;
                }}
                activeDot={{ r: 5, fill: "#00FF41" }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Event table ── */}
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-reactor-line">
          <h2 className="font-mono text-xs uppercase tracking-widest text-white font-bold">
            Latest Events
          </h2>
          <span className="font-mono text-[10px] text-stone-600">
            {events.length} rows · newest first
          </span>
        </div>

        {status === "loading" && events.length === 0 ? (
          <div className="p-10 text-center font-mono text-xs text-stone-600 animate-pulse">
            connecting…
          </div>
        ) : events.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="font-mono text-xs text-stone-500">No events yet.</p>
            <p className="font-mono text-[10px] text-stone-700">
              Go to the Simulator or Live Vault and perform actions to populate this feed.
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2 border-b border-reactor-line text-[9px] font-mono uppercase tracking-widest text-stone-600">
              <span className="col-span-2">when</span>
              <span className="col-span-2">kind</span>
              <span className="col-span-3">state</span>
              <span className="col-span-1">n</span>
              <span className="col-span-1">R(n)</span>
              <span className="col-span-3">detail</span>
            </div>
            <div className="divide-y divide-reactor-line max-h-[600px] overflow-y-auto scanlines">
              {events.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "glow" | "warn" | "danger" | "muted";
}) {
  const textColor =
    color === "glow" ? "text-reactor-glow"
    : color === "warn" ? "text-reactor-warn"
    : color === "danger" ? "text-reactor-danger"
    : "text-stone-400";

  return (
    <div className="panel p-5">
      <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500 mb-1">{label}</p>
      <p className={`text-3xl font-mono font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

function EventRow({ event: e }: { event: ReactorEvent }) {
  const rColor = STATE_COLOR[e.state] ?? "#6b6b70";
  return (
    <div className="grid grid-cols-12 gap-2 px-5 py-2.5 hover:bg-white/[0.015] transition-colors text-[11px] font-mono items-center">
      <span className="col-span-2 text-stone-600 tabular-nums">{age(e.ts)}</span>
      <span className="col-span-2"><KindBadge kind={e.kind} /></span>
      <span className="col-span-3"><StateBadge state={e.state} /></span>
      <span className="col-span-1 text-stone-500">n={e.n}</span>
      <span className="col-span-1 font-bold tabular-nums" style={{ color: rColor }}>
        {e.r_score.toFixed(2)}
      </span>
      <span className="col-span-3 text-stone-500 truncate">{e.detail || "—"}</span>
    </div>
  );
}
