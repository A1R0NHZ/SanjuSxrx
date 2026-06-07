// Reactor mathematical model — pure functions, no side effects.
// Mirrors the whitepaper definitions. All values are simulated; no real crypto.

export type ReactorState =
  | "OPEN"
  | "BACKOFF"
  | "QUARANTINE"
  | "SCRAM_LOCK"
  | "CONTAINMENT_LOCK"
  | "RECOVERY_REQUIRED"
  | "TAMPER_EVIDENT"
  | "DECOY_OPEN";

export const PARAMS = {
  // Computational cost
  C0: 1, alpha: 2, Cmax: 16384,
  // Memory MiB
  M0: 64, Mmax: 2048,
  // Argon2 iterations
  I0: 2, gamma: 1.5, Imax: 64,
  // Delay (ms)
  D0: 120, beta: 1.7, Dmax: 8000,
  // Decoy branches
  Bmax: 1024,
  // Decoy activation
  kappa: 0.04,
  // Risk weights
  w_c: 0.18, w_m: 0.10, w_i: 0.06, w_d: 0.0006, w_b: 0.35, w_a: 0.5, w_h: 1.2,
  // Thresholds
  T1: 1.5, T2: 3.5, T3: 6.0, T4: 8.5,
};

export interface Telemetry {
  n: number;
  C: number;
  M: number;
  I: number;
  D: number;
  B: number;
  U: number;
  R: number;
  state: ReactorState;
  pDecoy: number;
  anomaly: number;
  tamper: number;
}

export function compute(
  n: number,
  opts: { anomaly?: number; tamper?: number } = {},
): Telemetry {
  const p = PARAMS;
  const anomaly = opts.anomaly ?? Math.min(1, n * 0.08);
  const tamper = opts.tamper ?? 0;

  const C = Math.min(p.Cmax, p.C0 * Math.pow(p.alpha, n));
  const M = Math.min(p.Mmax, p.M0 * Math.pow(2, n));
  const I = Math.min(p.Imax, p.I0 * Math.pow(p.gamma, n));
  const D = Math.min(p.Dmax, p.D0 * Math.pow(p.beta, n));
  const B = Math.min(p.Bmax, Math.pow(2, n));
  const U = Math.log2(B + 1);
  const pDecoy = 1 - Math.exp(-p.kappa * B);

  const R =
    p.w_c * Math.log(1 + C) +
    p.w_m * Math.log(1 + M) +
    p.w_i * Math.log(1 + I) +
    p.w_d * D +
    p.w_b * U +
    p.w_a * anomaly +
    p.w_h * tamper;

  let state: ReactorState = "OPEN";
  if (tamper > 0) state = "TAMPER_EVIDENT";
  else if (R >= p.T4) state = "CONTAINMENT_LOCK";
  else if (R >= p.T3) state = "SCRAM_LOCK";
  else if (R >= p.T2) state = "QUARANTINE";
  else if (R >= p.T1) state = "BACKOFF";

  return { n, C, M, I, D, B, U, R, state, pDecoy, anomaly, tamper };
}

export const STATE_ORDER: ReactorState[] = [
  "OPEN",
  "BACKOFF",
  "QUARANTINE",
  "SCRAM_LOCK",
  "CONTAINMENT_LOCK",
];

export function stateClass(s: ReactorState): {
  text: string;
  bg: string;
  border: string;
  dot: string;
} {
  switch (s) {
    case "OPEN":
      return {
        text: "text-reactor-glow",
        bg: "bg-reactor-glow/10",
        border: "border-reactor-glow/40",
        dot: "bg-reactor-glow",
      };
    case "BACKOFF":
      return {
        text: "text-reactor-warn",
        bg: "bg-reactor-warn/10",
        border: "border-reactor-warn/40",
        dot: "bg-reactor-warn",
      };
    case "QUARANTINE":
      return {
        text: "text-reactor-danger",
        bg: "bg-reactor-danger/10",
        border: "border-reactor-danger/40",
        dot: "bg-reactor-danger",
      };
    case "SCRAM_LOCK":
    case "CONTAINMENT_LOCK":
    case "RECOVERY_REQUIRED":
    case "TAMPER_EVIDENT":
      return {
        text: "text-reactor-danger",
        bg: "bg-reactor-danger/20",
        border: "border-reactor-danger",
        dot: "bg-reactor-danger",
      };
    case "DECOY_OPEN":
      return {
        text: "text-reactor-warn",
        bg: "bg-reactor-warn/10",
        border: "border-reactor-warn/40",
        dot: "bg-reactor-warn",
      };
  }
}

export function fmt(x: number, digits = 2): string {
  if (x >= 1000) return x.toFixed(0);
  if (x >= 10) return x.toFixed(1);
  return x.toFixed(digits);
}
