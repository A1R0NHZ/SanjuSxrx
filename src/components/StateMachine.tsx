import { useEffect, useRef } from "react";
import { STATE_ORDER, stateClass, type ReactorState } from "@/lib/reactor";

export function StateMachine({ active }: { active: ReactorState }) {
  const items = STATE_ORDER;

  return (
    <div className="space-y-2">
      {/* Flow arrows row */}
      <div className="grid grid-cols-5 gap-2">
        {items.map((s) => {
          const isActive = s === active;
          const c = stateClass(s);
          const idx = items.indexOf(s);
          const activeIdx = items.indexOf(active);
          const isPast = idx < activeIdx;

          return (
            <StateNode
              key={s}
              state={s}
              isActive={isActive}
              isPast={isPast}
              c={c}
            />
          );
        })}
      </div>
      {/* Arrow between nodes */}
      <div className="grid grid-cols-5 gap-2 px-1">
        {items.map((s, i) => {
          const activeIdx = items.indexOf(active);
          if (i === items.length - 1) return <div key={s} />;
          const isHot = i < activeIdx;
          return (
            <div key={s} className="flex items-center justify-end pr-0">
              <svg width="100%" height="10" viewBox="0 0 100 10" preserveAspectRatio="none" className="overflow-visible">
                <line
                  x1="0" y1="5" x2="96" y2="5"
                  stroke={isHot ? "var(--color-reactor-danger)" : "rgba(255,255,255,0.08)"}
                  strokeWidth={isHot ? 1.5 : 1}
                  strokeDasharray={isHot ? "none" : "3 3"}
                />
                <path
                  d="M100 5 L94 2 L94 8 Z"
                  fill={isHot ? "var(--color-reactor-danger)" : "rgba(255,255,255,0.15)"}
                />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StateNode({
  state,
  isActive,
  isPast,
  c,
}: {
  state: ReactorState;
  isActive: boolean;
  isPast: boolean;
  c: ReturnType<typeof stateClass>;
}) {
  const pulseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !pulseRef.current) return;
    pulseRef.current.animate(
      [{ boxShadow: `0 0 0 0 ${c.text.includes("glow") ? "#00FF41" : c.text.includes("warn") ? "#FFB800" : "#FF3131"}44` },
       { boxShadow: `0 0 0 8px transparent` }],
      { duration: 1200, iterations: Infinity }
    );
  }, [isActive, c.text]);

  return (
    <div
      ref={pulseRef}
      className={`h-16 border flex flex-col items-center justify-center transition-all duration-300 ${
        isActive
          ? `border-2 ${c.border} ${c.bg}`
          : isPast
          ? "border border-reactor-danger/20 bg-reactor-danger/5 opacity-60"
          : "border-reactor-line opacity-40"
      }`}
    >
      <span
        className={`text-[8px] font-mono mb-1 text-center leading-tight px-1 ${
          isActive ? `${c.text} font-bold` : isPast ? "text-reactor-danger/60" : "text-stone-600"
        }`}
      >
        {state.replace("_", "_\n")}
      </span>
      <div
        className={`size-2 rounded-full ${
          isActive
            ? `${c.dot} animate-pulse`
            : isPast
            ? "bg-reactor-danger/30"
            : "bg-stone-800"
        }`}
      />
    </div>
  );
}
