import { useEffect, useRef } from "react";
import type { Telemetry } from "@/lib/reactor";

interface Props {
  tele: Telemetry;
}

const STATE_COLOR: Record<string, string> = {
  OPEN: "#00FF41",
  BACKOFF: "#FFB800",
  QUARANTINE: "#FF7700",
  SCRAM_LOCK: "#FF3131",
  CONTAINMENT_LOCK: "#FF0000",
  TAMPER_EVIDENT: "#FF3131",
  RECOVERY_REQUIRED: "#FF3131",
  DECOY_OPEN: "#FFB800",
};

export function ReactorCore({ tele }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const t = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const color = STATE_COLOR[tele.state] ?? "#00FF41";
    const intensity = Math.min(1, tele.R / 10);
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const baseR = Math.min(W, H) * 0.18;

    function draw() {
      t.current += 0.018 + intensity * 0.025;

      ctx!.clearRect(0, 0, W, H);

      // Outer glow rings — 3 rings that ripple outward
      const numRings = 3;
      for (let r = 0; r < numRings; r++) {
        const phase = t.current + (r * Math.PI * 2) / numRings;
        const ripple = (Math.sin(phase) + 1) / 2;
        const ringR = baseR * (1.6 + r * 0.55 + ripple * 0.35);
        const alpha = (1 - ripple) * (0.12 + intensity * 0.22);

        const grd = ctx!.createRadialGradient(cx, cy, ringR * 0.85, cx, cy, ringR);
        grd.addColorStop(0, color + Math.round(alpha * 255).toString(16).padStart(2, "0"));
        grd.addColorStop(1, "transparent");

        ctx!.beginPath();
        ctx!.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx!.fillStyle = grd;
        ctx!.fill();
      }

      // Rotating inner hex segments
      const segments = tele.state === "OPEN" ? 6 : tele.state === "BACKOFF" ? 6 : 8;
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2 + t.current * 0.4;
        const wobble = 1 + Math.sin(t.current * 2 + i) * 0.04 * intensity;
        const x1 = cx + Math.cos(angle) * baseR * 0.55 * wobble;
        const y1 = cy + Math.sin(angle) * baseR * 0.55 * wobble;
        const x2 = cx + Math.cos(angle + (Math.PI * 2) / segments) * baseR * 0.55 * wobble;
        const y2 = cy + Math.sin(angle + (Math.PI * 2) / segments) * baseR * 0.55 * wobble;

        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(x1, y1);
        ctx!.lineTo(x2, y2);
        ctx!.closePath();
        const segAlpha = 0.08 + intensity * 0.12 + (Math.sin(t.current * 1.5 + i) + 1) * 0.04;
        ctx!.fillStyle = color + Math.round(segAlpha * 255).toString(16).padStart(2, "0");
        ctx!.fill();
        ctx!.strokeStyle = color + "33";
        ctx!.lineWidth = 0.5;
        ctx!.stroke();
      }

      // Core circle
      const coreGrd = ctx!.createRadialGradient(cx, cy, 0, cx, cy, baseR);
      const pulse = 0.3 + Math.sin(t.current * (1 + intensity * 3)) * 0.15 * (0.3 + intensity);
      coreGrd.addColorStop(0, color + Math.round((0.55 + pulse) * 255).toString(16).padStart(2, "0"));
      coreGrd.addColorStop(0.5, color + Math.round(0.25 * 255).toString(16).padStart(2, "0"));
      coreGrd.addColorStop(1, "transparent");

      ctx!.beginPath();
      ctx!.arc(cx, cy, baseR, 0, Math.PI * 2);
      ctx!.fillStyle = coreGrd;
      ctx!.fill();

      // Center dot
      ctx!.beginPath();
      ctx!.arc(cx, cy, baseR * 0.18, 0, Math.PI * 2);
      ctx!.fillStyle = color;
      ctx!.shadowBlur = 18 + intensity * 24;
      ctx!.shadowColor = color;
      ctx!.fill();
      ctx!.shadowBlur = 0;

      // Danger cracks when SCRAM or CONTAINMENT
      if (tele.state === "SCRAM_LOCK" || tele.state === "CONTAINMENT_LOCK") {
        const numCracks = tele.state === "CONTAINMENT_LOCK" ? 8 : 5;
        for (let i = 0; i < numCracks; i++) {
          const a = (i / numCracks) * Math.PI * 2 + t.current * 0.12;
          const len = baseR * (0.8 + Math.sin(t.current * 2 + i * 1.3) * 0.3);
          ctx!.beginPath();
          ctx!.moveTo(cx + Math.cos(a) * baseR * 0.28, cy + Math.sin(a) * baseR * 0.28);
          ctx!.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
          ctx!.strokeStyle = color + "88";
          ctx!.lineWidth = 1 + intensity;
          ctx!.stroke();
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [tele.state, tele.R]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={220}
        height={220}
        className="w-full max-w-[220px]"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="text-center">
        <p className="text-[9px] font-mono uppercase tracking-widest text-stone-500">Reactor Core</p>
        <p className="font-mono text-sm font-bold" style={{ color: STATE_COLOR[tele.state] ?? "#00FF41" }}>
          {tele.state}
        </p>
      </div>
    </div>
  );
}
