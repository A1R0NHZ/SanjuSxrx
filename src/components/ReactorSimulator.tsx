import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compute, fmt, stateClass, PARAMS } from "@/lib/reactor";
import {
  sealVault,
  openVault,
  decoyPayload,
  passphraseEntropy,
  deriveMaster,
  splitKeys,
  b64,
  randomBytes,
  type VaultBlob,
} from "@/lib/crypto";
import { pushEvent } from "@/lib/api/events.functions";
import { CostCurves } from "./CostCurves";
import { StateMachine } from "./StateMachine";
import { ReactorCore } from "./ReactorCore";
import { LiveRiskChart } from "./LiveRiskChart";

// ── Types ─────────────────────────────────────────────────────────────────
type LogKind = "attempt" | "tamper" | "reset" | "decoy" | "zeroize" | "info" | "ok" | "warn";

interface Entry {
  ts: number;
  kind: LogKind;
  text: string;
}

interface HistoryPoint {
  n: number;
  R: number;
  C: number;
  D: number;
  state: string;
}

// ── PBKDF2 iteration schedule driven by reactor n ─────────────────────────
// Baseline 100k, doubles per failed attempt, capped at 3.2M
const ITER_BASE = 100_000;
const ITER_CAP  = 3_200_000;
function itersFor(n: number) {
  return Math.min(ITER_CAP, ITER_BASE * Math.pow(2, Math.min(n, 5)));
}

// ── Component ─────────────────────────────────────────────────────────────
export function ReactorSimulator() {
  // ── Vault state ──────────────────────────────────────────────────────
  const [vault, setVault]       = useState<VaultBlob | null>(null);
  const [secret, setSecret]     = useState("");      // plaintext to seal
  const [sealPass, setSealPass] = useState("");      // passphrase used to seal
  const [revealed, setRevealed] = useState<string | null>(null);

  // ── Reactor state ────────────────────────────────────────────────────
  const [n, setN]           = useState(0);
  const [tamperBit, setTamperBit] = useState(false); // ciphertext tampered?
  const [anomaly, setAnomaly]     = useState(0);

  // ── UI state ─────────────────────────────────────────────────────────
  const [pass, setPass]           = useState("");
  const [busy, setBusy]           = useState(false);
  const [log, setLog]             = useState<Entry[]>([]);
  const [history, setHistory]     = useState<HistoryPoint[]>([]);
  const [autoAttack, setAutoAttack] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [showSetup, setShowSetup]   = useState(false);

  const autoRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logRef   = useRef<HTMLDivElement>(null);
  const busyRef  = useRef(false);

  // Init
  useEffect(() => {
    const t0 = compute(0);
    setLog([{ ts: Date.now(), kind: "info", text: "Reactor cold-start. No vault sealed yet." }]);
    setHistory([{ n: 0, R: t0.R, C: t0.C, D: t0.D, state: t0.state }]);
  }, []);

  const tele    = useMemo(() => compute(n, { tamper: tamperBit ? 1 : 0, anomaly }), [n, tamperBit, anomaly]);
  const c       = stateClass(tele.state);
  const isLocked = tele.state === "SCRAM_LOCK" || tele.state === "CONTAINMENT_LOCK";
  const entropy  = passphraseEntropy(pass);
  const sealEntropy = passphraseEntropy(sealPass);

  const pushLog = useCallback(
    (e: Omit<Entry, "ts">) => setLog((l) => [...l.slice(-80), { ts: Date.now(), ...e }]),
    [],
  );

  useEffect(() => { logRef.current?.scrollTo({ top: 1e9 }); }, [log]);

  // ── Seal ─────────────────────────────────────────────────────────────
  const seal = async () => {
    if (!secret.trim()) { pushLog({ kind: "warn", text: "Enter a secret payload before sealing." }); return; }
    if (!sealPass)       { pushLog({ kind: "warn", text: "Enter a passphrase before sealing." }); return; }
    setBusy(true);
    const iters = itersFor(0);
    pushLog({ kind: "info", text: `Sealing with PBKDF2-SHA512 ×${iters.toLocaleString()} → HKDF-SHA512 → AES-256-GCM + HMAC-SHA512…` });
    try {
      const t0 = performance.now();
      const blob = await sealVault(secret, sealPass, iters);
      setVault(blob);
      setTamperBit(false);
      setRevealed(null);
      setN(0);
      const dt = (performance.now() - t0).toFixed(0);
      pushLog({ kind: "ok", text: `Vault sealed in ${dt}ms. CT=${b64.decode(blob.ct).length}B. HMAC-SHA512 tag bound.` });
      pushLog({ kind: "info", text: `Now submit wrong passphrases below to watch the reactor escalate.` });
      setSecret("");
      setSealPass("");
      setShowSetup(false);
      pushEvent({ data: { kind: "info", state: "OPEN", n: 0, r_score: tele.R, detail: `vault sealed in ${dt}ms` } }).catch(() => {});
    } catch (e) {
      pushLog({ kind: "warn", text: `Seal error: ${(e as Error).message}` });
    }
    setBusy(false);
  };

  // ── Attempt (real crypto) ─────────────────────────────────────────────
  const attempt = useCallback(
    async (force?: "tamper" | "decoy") => {
      if (busyRef.current) return;

      if (isLocked) {
        pushLog({ kind: "info", text: "REJECTED: recovery credential required." });
        return;
      }

      // Tamper: flip a random ciphertext byte so HMAC will fail for real
      if (force === "tamper") {
        if (!vault) { pushLog({ kind: "warn", text: "Seal a vault first." }); return; }
        const ct = b64.decode(vault.ct);
        ct[Math.floor(Math.random() * ct.length)] ^= (randomBytes(1)[0] | 1);
        setVault((v) => v ? { ...v, ct: b64.encode(ct) } : v);
        setTamperBit(true);
        const t = compute(n, { tamper: 1, anomaly });
        pushLog({ kind: "tamper", text: `Ciphertext byte ${Math.floor(Math.random() * ct.length)} flipped. Next HMAC verify will FAIL for real.` });
        pushEvent({ data: { kind: "tamper", state: t.state, n, r_score: t.R, detail: "byte flip injected" } }).catch(() => {});
        return;
      }

      busyRef.current = true;
      setBusy(true);
      setRevealed(null);

      // Reactor-enforced delay first
      const reactorDelay = Math.min(tele.D, 2000);
      if (reactorDelay > 50) {
        pushLog({ kind: "info", text: `Reactor delay: ${reactorDelay.toFixed(0)}ms enforced before key derivation…` });
        await new Promise((r) => setTimeout(r, reactorDelay));
      }

      const iters = itersFor(n);

      // No vault sealed → pure math simulation
      if (!vault) {
        const next = n + 1;
        const t = compute(next, { anomaly });
        pushLog({ kind: "attempt", text: `[sim] Attempt #${next} · PBKDF2 ×${iters.toLocaleString()} · R=${fmt(t.R)} · ${t.state}` });
        pushEvent({ data: { kind: "attempt", state: t.state, n: next, r_score: t.R, detail: `sim iters=${iters}` } }).catch(() => {});
        setN(next);
        setHistory((h) => [...h.slice(-49), { n: next, R: t.R, C: t.C, D: t.D, state: t.state }]);
        if (t.state === "SCRAM_LOCK" || t.state === "CONTAINMENT_LOCK") {
          pushLog({ kind: "zeroize", text: "ZEROIZE_SESSION: session keys wiped." });
          pushLog({ kind: "info", text: `${t.state}: recovery required.` });
          pushEvent({ data: { kind: "zeroize", state: t.state, n: next, r_score: t.R, detail: "session zeroized" } }).catch(() => {});
        }
        busyRef.current = false;
        setBusy(false);
        setPass("");
        return;
      }

      // Real vault — real crypto attempt
      const t0 = performance.now();
      pushLog({ kind: "info", text: `PBKDF2-SHA512 ×${iters.toLocaleString()} · deriving keys…` });

      // Decoy path: derive a decoy from a public anchor + hSalt (no passphrase needed)
      if (force === "decoy") {
        try {
          const { decoy: seed } = await splitKeys(
            await deriveMaster("decoy-public-anchor", b64.decode(vault.hSalt), 1),
            b64.decode(vault.hSalt),
          );
          const t = compute(n + 1, { anomaly });
          const branch = 1 + Math.floor(Math.random() * Math.max(t.B, 1));
          const dp = await decoyPayload(seed, branch);
          setRevealed(dp);
          const next = n + 1;
          setN(next);
          setHistory((h) => [...h.slice(-49), { n: next, R: t.R, C: t.C, D: t.D, state: t.state }]);
          pushLog({ kind: "decoy", text: `Decoy branch ${branch}/${Math.max(t.B, 1)} returned (inert plausible payload).` });
          pushEvent({ data: { kind: "decoy", state: t.state, n: next, r_score: t.R, detail: `branch ${branch}` } }).catch(() => {});
        } catch (e) {
          pushLog({ kind: "warn", text: `Decoy error: ${(e as Error).message}` });
        }
        busyRef.current = false;
        setBusy(false);
        setPass("");
        return;
      }

      // Real passphrase attempt
      if (!pass) {
        pushLog({ kind: "warn", text: "Enter a passphrase to attempt." });
        busyRef.current = false;
        setBusy(false);
        return;
      }

      try {
        const res = await openVault(vault, pass, iters);
        const dt = (performance.now() - t0).toFixed(0);

        if (res.ok) {
          // ✓ Correct passphrase
          setRevealed(res.plaintext);
          setN(0);
          setTamperBit(false);
          setHistory((h) => [...h.slice(-49), { n: 0, R: compute(0).R, C: compute(0).C, D: compute(0).D, state: "OPEN" }]);
          pushLog({ kind: "ok", text: `UNLOCKED in ${dt}ms. Plaintext decrypted. Reactor reset to n=0.` });
          pushEvent({ data: { kind: "reset", state: "OPEN", n: 0, r_score: compute(0).R, detail: `unlocked in ${dt}ms` } }).catch(() => {});
          setAutoAttack(false);

        } else if (res.reason === "tamper") {
          // HMAC failed for real
          const next = n + 1;
          setN(next);
          const t = compute(next, { tamper: 1, anomaly });
          setHistory((h) => [...h.slice(-49), { n: next, R: t.R, C: t.C, D: t.D, state: t.state }]);
          pushLog({ kind: "tamper", text: `HMAC-SHA512 FAILED (real crypto). Ciphertext is corrupted. TAMPER_EVIDENT.` });
          pushEvent({ data: { kind: "tamper", state: t.state, n: next, r_score: t.R, detail: "HMAC fail" } }).catch(() => {});

        } else {
          // Wrong passphrase
          const next = n + 1;
          setN(next);
          const t = compute(next, { anomaly });
          setHistory((h) => [...h.slice(-49), { n: next, R: t.R, C: t.C, D: t.D, state: t.state }]);
          pushLog({
            kind: "attempt",
            text: `Attempt #${next} REJECTED in ${dt}ms. PBKDF2 ×${iters.toLocaleString()} · R=${fmt(t.R)} → ${t.state}`,
          });
          pushEvent({ data: { kind: "attempt", state: t.state, n: next, r_score: t.R, detail: `iters=${iters} dt=${dt}ms` } }).catch(() => {});

          if (t.pDecoy > 0.15 && Math.random() < t.pDecoy) {
            try {
              const { decoy: seed } = await splitKeys(
                await deriveMaster("decoy-public-anchor", b64.decode(vault.hSalt), 1),
                b64.decode(vault.hSalt),
              );
              const branch = 1 + Math.floor(Math.random() * Math.max(t.B, 1));
              const dp = await decoyPayload(seed, branch);
              setRevealed(dp);
              pushLog({ kind: "decoy", text: `Decoy branch ${branch}/${Math.max(t.B, 1)} fired automatically (P=${fmt(t.pDecoy)}).` });
              pushEvent({ data: { kind: "decoy", state: t.state, n: next, r_score: t.R, detail: `auto branch ${branch}` } }).catch(() => {});
            } catch { /* silent */ }
          }

          if (t.state === "SCRAM_LOCK" || t.state === "CONTAINMENT_LOCK") {
            setRevealed(null);
            pushLog({ kind: "zeroize", text: "ZEROIZE_SESSION: K_master, K_enc, K_mac, K_decoy wiped from process memory." });
            pushLog({ kind: "info", text: `${t.state}: recovery credential required. Vault sealed; no files touched.` });
            pushEvent({ data: { kind: "zeroize", state: t.state, n: next, r_score: t.R, detail: "session zeroized" } }).catch(() => {});
            setAutoAttack(false);
          }
        }
      } catch (e) {
        pushLog({ kind: "warn", text: `Crypto error: ${(e as Error).message}` });
      }

      busyRef.current = false;
      setBusy(false);
      setPass("");
    },
    [isLocked, vault, pass, n, tele.D, anomaly, pushLog],
  );

  // ── Auto-attack ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoAttack) {
      if (autoRef.current) clearTimeout(autoRef.current);
      return;
    }
    const schedule = () => {
      if (isLocked) { setAutoAttack(false); return; }
      attempt();
      const delay = Math.max(600, Math.min(tele.D + 500, 4000));
      autoRef.current = setTimeout(schedule, delay);
    };
    autoRef.current = setTimeout(schedule, 600);
    return () => { if (autoRef.current) clearTimeout(autoRef.current); };
  }, [autoAttack, isLocked, attempt, tele.D]);

  // ── Recovery / Reset ──────────────────────────────────────────────────
  const recover = () => {
    setN(0);
    setTamperBit(false);
    setRevealed(null);
    setAutoAttack(false);
    const t0 = compute(0);
    setHistory((h) => [...h.slice(-49), { n: 0, R: t0.R, C: t0.C, D: t0.D, state: t0.state }]);
    pushLog({ kind: "reset", text: "Recovery credential accepted. Reactor re-keyed. n=0." });
    pushEvent({ data: { kind: "reset", state: "OPEN", n: 0, r_score: t0.R, detail: "recovery accepted" } }).catch(() => {});
  };

  const wipeVault = () => {
    setVault(null);
    setRevealed(null);
    setN(0);
    setTamperBit(false);
    setAutoAttack(false);
    const t0 = compute(0);
    setHistory([{ n: 0, R: t0.R, C: t0.C, D: t0.D, state: t0.state }]);
    pushLog({ kind: "info", text: "Vault wiped. Seal a new one to continue." });
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="bg-reactor-panel border border-reactor-line rounded-sm shadow-2xl">
      <div className="border border-white/5 p-5 sm:p-7 space-y-7">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
          <div className="flex-1 space-y-1">
            <p className="text-[10px] font-mono text-stone-500 uppercase">Current Risk Score</p>
            <h2 className={`text-4xl sm:text-5xl font-mono font-bold transition-colors duration-500 ${c.text}`}>
              R(n) = {fmt(tele.R)}
            </h2>
            <p className="text-[10px] font-mono text-stone-600">
              n={tele.n} · U={fmt(tele.U)} bits · PBKDF2 ×{itersFor(n).toLocaleString()} · {vault ? "VAULT SEALED" : "NO VAULT"}
            </p>
            <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 font-mono font-bold border text-sm transition-all duration-500 ${c.bg} ${c.border} ${c.text}`}>
              <span className={`size-2 rounded-full animate-pulse ${c.dot}`} />
              {tele.state}
              {tamperBit && <span className="ml-2 text-reactor-danger text-[9px]">TAMPERED</span>}
            </div>
          </div>
          <div className="shrink-0"><ReactorCore tele={tele} /></div>
        </div>

        {/* ── State Machine ── */}
        <StateMachine active={
          (["OPEN","BACKOFF","QUARANTINE","SCRAM_LOCK","CONTAINMENT_LOCK"].includes(tele.state)
            ? tele.state : "QUARANTINE") as Parameters<typeof StateMachine>[0]["active"]
        } />

        {/* ── Telemetry strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-reactor-line rounded-sm overflow-hidden">
          {[
            ["C(n)", `${fmt(tele.C)}u`, "cost"],
            ["M(n)", `${fmt(tele.M)} MiB`, "mem"],
            ["D(n)", `${fmt(tele.D)} ms`, "delay"],
            ["PBKDF2", itersFor(n).toLocaleString(), "iters"],
          ].map(([k, v, sub]) => (
            <div key={k} className="bg-reactor-panel px-3 py-3 space-y-0.5">
              <p className="text-[9px] font-mono text-stone-500 uppercase">{k}</p>
              <p className="font-mono text-sm text-white leading-none">{v}</p>
              <p className="text-[9px] font-mono text-stone-600">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Live Risk Chart ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-mono font-bold text-white uppercase">Live Risk Score R(n)</h3>
            <span className="text-[9px] font-mono text-stone-600">{history.length} points</span>
          </div>
          <LiveRiskChart history={history} />
        </div>

        {/* ── Vault setup panel ── */}
        <div className="border border-reactor-line">
          <button
            onClick={() => setShowSetup((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-mono uppercase tracking-widest hover:bg-white/5 transition-colors"
          >
            <span className="text-stone-400">
              {vault ? "▸ vault sealed — reseal or wipe" : "▸ seal a vault to enable real crypto"}
            </span>
            <span className={vault ? "text-reactor-glow" : "text-reactor-warn"}>
              {vault ? "ACTIVE" : "NO VAULT"}
            </span>
          </button>

          {showSetup && (
            <div className="border-t border-reactor-line p-4 space-y-4 bg-black/20">
              <p className="text-[10px] font-mono text-stone-500 leading-relaxed">
                Type a secret and a passphrase. The vault will be sealed with{" "}
                <span className="text-reactor-glow">AES-256-GCM + HMAC-SHA512</span> right here in your browser (WebCrypto).
                Then use wrong passphrases below to watch the reactor escalate <em>for real</em>.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-stone-500 uppercase">Secret payload</label>
                <textarea
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  disabled={busy}
                  rows={3}
                  placeholder="The thing this vault protects…"
                  className="w-full bg-black/40 border border-reactor-line px-3 py-2 font-mono text-sm text-white focus:border-reactor-glow/60 outline-none disabled:opacity-50 resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-stone-500 uppercase flex justify-between">
                  <span>Vault passphrase</span>
                  {sealPass && (
                    <span className={sealEntropy < 40 ? "text-reactor-danger" : sealEntropy < 70 ? "text-reactor-warn" : "text-reactor-glow"}>
                      ~{sealEntropy} bits
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={sealPass}
                  onChange={(e) => setSealPass(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && seal()}
                  disabled={busy}
                  placeholder="••••••••••••"
                  className="w-full bg-black/40 border border-reactor-line px-3 py-3 font-mono text-sm text-white focus:border-reactor-glow/60 outline-none disabled:opacity-50"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={seal}
                  disabled={busy || !secret.trim() || !sealPass}
                  className="flex-1 h-10 border border-reactor-glow/40 bg-reactor-glow/10 hover:bg-reactor-glow hover:text-black font-mono font-bold text-xs tracking-widest disabled:opacity-40 transition-all"
                >
                  {busy ? "SEALING…" : "SEAL VAULT"}
                </button>
                {vault && (
                  <button
                    onClick={wipeVault}
                    disabled={busy}
                    className="px-4 h-10 border border-reactor-line hover:bg-reactor-danger/20 hover:border-reactor-danger font-mono text-xs tracking-widest transition-all"
                  >
                    WIPE
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Passphrase attempt ── */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-stone-500 uppercase flex justify-between items-center">
            <span>
              Passphrase Attempt —{" "}
              <span className={vault ? "text-reactor-glow" : "text-reactor-warn"}>
                {vault ? "REAL AES-256-GCM + HMAC-SHA512" : "simulation (seal a vault above for real crypto)"}
              </span>
            </span>
            {pass && (
              <span className={entropy < 40 ? "text-reactor-danger" : entropy < 70 ? "text-reactor-warn" : "text-reactor-glow"}>
                ~{entropy} bits
              </span>
            )}
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && attempt()}
              placeholder="••••••••••••"
              disabled={busy || isLocked}
              className="flex-1 bg-black/40 border border-reactor-line px-3 py-3 font-mono text-sm text-white focus:border-reactor-glow/60 outline-none disabled:opacity-50 transition-colors"
            />
            <button
              onClick={() => attempt()}
              disabled={busy || isLocked}
              className="px-4 border border-reactor-line hover:bg-white/5 font-mono text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {busy ? "deriving…" : "submit"}
            </button>
          </div>
          {pass && (
            <div className="h-1 bg-black/40 overflow-hidden rounded-full">
              <div
                className={`h-full transition-all duration-300 ${entropy < 40 ? "bg-reactor-danger" : entropy < 70 ? "bg-reactor-warn" : "bg-reactor-glow"}`}
                style={{ width: `${Math.min(100, entropy)}%` }}
              />
            </div>
          )}
        </div>

        {/* ── Revealed payload ── */}
        {revealed && (
          <div className="border border-reactor-glow/30 bg-reactor-glow/5 p-4 space-y-2">
            <p className="text-[10px] font-mono text-reactor-glow uppercase">
              {revealed.startsWith("# decoy") ? "Decoy payload (inert)" : "Decrypted payload (session only)"}
            </p>
            <pre className="font-mono text-sm text-white whitespace-pre-wrap break-words leading-relaxed">
              {revealed}
            </pre>
            <button
              onClick={() => setRevealed(null)}
              className="text-[10px] font-mono uppercase tracking-widest text-stone-500 hover:text-reactor-danger transition-colors"
            >
              zeroize on screen ✕
            </button>
          </div>
        )}

        {/* ── Anomaly tuner ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono text-stone-500 uppercase">
              Anomaly Signal A(n) — rate / geo / device
            </label>
            <span className="font-mono text-xs text-reactor-warn">{anomaly.toFixed(2)}</span>
          </div>
          <input
            type="range" min={0} max={1} step={0.01} value={anomaly}
            onChange={(e) => setAnomaly(Number(e.target.value))}
            className="w-full accent-reactor-warn h-1 bg-reactor-line cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono text-stone-600">
            <span>0 — no anomaly</span>
            <span>1.0 — max signal</span>
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => attempt()}
            disabled={busy || isLocked}
            className="h-12 border border-reactor-glow/30 bg-reactor-glow/5 hover:bg-reactor-glow hover:text-black transition-all font-mono font-bold text-xs tracking-widest disabled:opacity-50"
          >
            BRUTE_FORCE
          </button>
          <button
            onClick={() => attempt("decoy")}
            disabled={busy || isLocked || !vault}
            className="h-12 border border-reactor-warn/30 bg-reactor-warn/5 hover:bg-reactor-warn hover:text-black transition-all font-mono font-bold text-xs tracking-widest disabled:opacity-50"
          >
            TRIGGER DECOY
          </button>
          <button
            onClick={() => attempt("tamper")}
            disabled={busy || !vault || tamperBit}
            className="h-12 border border-reactor-danger/30 bg-reactor-danger/5 hover:bg-reactor-danger hover:text-black transition-all font-mono font-bold text-xs tracking-widest disabled:opacity-50"
          >
            INJECT TAMPER
          </button>
          <button
            onClick={recover}
            className="h-12 border border-reactor-line hover:bg-white/10 font-mono font-bold text-xs tracking-widest"
          >
            RECOVER / RESET
          </button>
        </div>

        {/* ── Auto-attack toggle ── */}
        <div className="flex items-center justify-between border border-reactor-line px-4 py-3">
          <div>
            <p className="font-mono text-xs text-white uppercase font-bold">Auto-Attack Mode</p>
            <p className="font-mono text-[10px] text-stone-500">
              {vault
                ? "Fires wrong-passphrase attempts with real PBKDF2 cost until SCRAM_LOCK"
                : "Fires simulated attempts until SCRAM_LOCK (seal a vault for real crypto)"}
            </p>
          </div>
          <button
            onClick={() => setAutoAttack((v) => !v)}
            disabled={isLocked}
            className={`relative w-12 h-6 rounded-full border transition-all disabled:opacity-40 ${
              autoAttack ? "bg-reactor-danger/20 border-reactor-danger" : "bg-black/40 border-reactor-line"
            }`}
            aria-label="Toggle auto-attack"
          >
            <span className={`absolute top-1 size-4 rounded-full transition-all ${
              autoAttack ? "left-7 bg-reactor-danger" : "left-1 bg-stone-600"
            }`} />
          </button>
        </div>

        {/* ── Cost curves ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono font-bold text-white uppercase">Exponential Cost Reaction</h3>
            <button
              onClick={() => setShowParams((v) => !v)}
              className="text-[10px] font-mono text-stone-500 hover:text-reactor-glow uppercase tracking-widest"
            >
              {showParams ? "hide params ↑" : "show params ↓"}
            </button>
          </div>
          <CostCurves current={tele} maxN={10} />
          {showParams && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono border-t border-reactor-line pt-3">
              {([
                ["α (cost)", PARAMS.alpha], ["β (delay)", PARAMS.beta],
                ["γ (iters)", PARAMS.gamma], ["C_max", PARAMS.Cmax],
                ["M_max", PARAMS.Mmax], ["D_max", PARAMS.Dmax],
                ["T₁", PARAMS.T1], ["T₂", PARAMS.T2],
                ["T₃", PARAMS.T3], ["T₄", PARAMS.T4],
                ["κ (decoy)", PARAMS.kappa], ["w_b", PARAMS.w_b],
              ] as [string, number][]).map(([k, v]) => (
                <div key={k} className="bg-black/30 px-2 py-1.5">
                  <p className="text-stone-500">{k}</p>
                  <p className="text-white">{v}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Telemetry Log ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-mono font-bold text-white uppercase">Telemetry Log</h3>
            <button onClick={() => setLog([])} className="text-[10px] font-mono text-stone-600 hover:text-reactor-danger uppercase tracking-widest">
              clear
            </button>
          </div>
          <div ref={logRef} className="h-52 overflow-y-auto bg-black/40 border border-reactor-line font-mono text-[11px] p-3 space-y-1 scanlines">
            {log.map((e, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-stone-600 shrink-0">{new Date(e.ts).toLocaleTimeString("en-GB")}</span>
                <span className={
                  e.kind === "tamper" || e.kind === "zeroize" ? "text-reactor-danger"
                  : e.kind === "decoy" ? "text-reactor-warn"
                  : e.kind === "reset" || e.kind === "ok" ? "text-reactor-glow"
                  : e.kind === "warn" ? "text-reactor-warn"
                  : e.kind === "attempt" ? "text-stone-300"
                  : "text-stone-500"
                }>{e.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
