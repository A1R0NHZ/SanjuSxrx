import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { compute, fmt, stateClass, PARAMS } from "@/lib/reactor";
import { StateMachine } from "@/components/StateMachine";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Live Vault — SxCryptRx" },
      {
        name: "description",
        content:
          "A fully working AES-256-GCM + HMAC-SHA512 vault in your browser, hardened by the SxCryptRx reactor: adaptive PBKDF2-SHA512 iterations, tamper evidence, decoys, and session zeroization.",
      },
      { property: "og:title", content: "SxCryptRx — Live Vault" },
      {
        property: "og:description",
        content:
          "Real, in-browser, reactor-defended encryption. No server. No telemetry. Vault-local.",
      },
    ],
  }),
  component: VaultPage,
});

const LS_KEY = "sxcrypt.vault.v1";
const LS_ATTEMPTS = "sxcrypt.attempts.v1";

type LogKind = "info" | "ok" | "warn" | "danger" | "decoy";
interface Entry { ts: number; kind: LogKind; text: string }

function loadBlob(): VaultBlob | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? (JSON.parse(s) as VaultBlob) : null;
  } catch { return null; }
}
function saveBlob(b: VaultBlob | null) {
  if (typeof localStorage === "undefined") return;
  if (b === null) localStorage.removeItem(LS_KEY);
  else localStorage.setItem(LS_KEY, JSON.stringify(b));
}
function loadAttempts(): number {
  if (typeof localStorage === "undefined") return 0;
  return Number(localStorage.getItem(LS_ATTEMPTS) ?? "0") || 0;
}
function saveAttempts(n: number) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LS_ATTEMPTS, String(n));
}

// Adaptive PBKDF2 iterations driven by reactor n. Baseline 200k, doubles per
// failed attempt, capped to keep the UI responsive.
const ITER_BASE = 200_000;
const ITER_CAP = 4_000_000;
function itersFor(n: number) {
  return Math.min(ITER_CAP, ITER_BASE * Math.pow(2, Math.min(n, 6)));
}

function VaultPage() {
  const [hydrated, setHydrated] = useState(false);
  const [blob, setBlob] = useState<VaultBlob | null>(null);
  const [n, setN] = useState(0);
  const [pass, setPass] = useState("");
  const [pt, setPt] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [log, setLog] = useState<Entry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const b = loadBlob();
    setBlob(b);
    setN(loadAttempts());
    setHydrated(true);
    push("info", b ? "Vault present. Sealed." : "No vault on this device.");
  }, []);

  useEffect(() => { logRef.current?.scrollTo({ top: 1e9 }); }, [log]);

  const push = (kind: LogKind, text: string) =>
    setLog((l) => [...l.slice(-60), { ts: Date.now(), kind, text }]);

  const tele = useMemo(() => compute(n), [n]);
  const c = stateClass(tele.state);
  const locked = tele.state === "SCRAM_LOCK" || tele.state === "CONTAINMENT_LOCK";
  const entropy = passphraseEntropy(pass);

  const create = async () => {
    if (!pass || !pt) { push("warn", "Need both passphrase and plaintext."); return; }
    if (entropy < 40) { push("warn", `Weak passphrase (~${entropy} bits). Continuing anyway.`); }
    setBusy(true);
    const iters = itersFor(0);
    push("info", `Sealing with PBKDF2-SHA512 ×${iters.toLocaleString()} → HKDF → AES-256-GCM…`);
    try {
      const t0 = performance.now();
      const b = await sealVault(pt, pass, iters);
      saveBlob(b); setBlob(b);
      saveAttempts(0); setN(0);
      setPt(""); setPass(""); setRevealed(null);
      push("ok", `Sealed in ${(performance.now() - t0).toFixed(0)}ms. ${b.ct.length}b ciphertext + HMAC-SHA512 tag.`);
    } catch (e) {
      push("danger", `Seal failed: ${(e as Error).message}`);
    }
    setBusy(false);
  };

  const unlock = async () => {
    if (!blob) { push("warn", "No vault to open."); return; }
    if (locked) { push("danger", `${tele.state}: recovery required.`); return; }
    if (!pass) { push("warn", "Passphrase required."); return; }
    setBusy(true);
    const iters = itersFor(n);
    const reactorDelay = Math.min(PARAMS.Dmax, tele.D);
    push("info", `Reactor delay ${reactorDelay.toFixed(0)}ms · PBKDF2 ×${iters.toLocaleString()}…`);
    await new Promise((r) => setTimeout(r, reactorDelay));
    try {
      const t0 = performance.now();
      const res = await openVault(blob, pass, iters);
      const dt = performance.now() - t0;
      if (res.ok) {
        setRevealed(res.plaintext);
        saveAttempts(0); setN(0);
        push("ok", `Unlocked in ${dt.toFixed(0)}ms. Reactor reset.`);
      } else if (res.reason === "tamper") {
        push("danger", "HMAC verify FAILED. TAMPER_EVIDENT — vault contents untrusted.");
      } else {
        const next = n + 1;
        saveAttempts(next); setN(next);
        const t = compute(next);
        push("warn", `Reject #${next}. R=${fmt(t.R)} → ${t.state}.`);
        if (Math.random() < t.pDecoy && t.B >= 2) {
          const { decoy: seed } = await splitKeys(
            await deriveMaster("decoy-public-anchor", b64.decode(blob.hSalt), 1),
            b64.decode(blob.hSalt),
          );
          const branch = 1 + Math.floor(Math.random() * t.B);
          const dp = await decoyPayload(seed, branch);
          setRevealed(dp);
          push("decoy", `Decoy branch ${branch}/${t.B} returned (inert).`);
        }
        if (t.state === "SCRAM_LOCK" || t.state === "CONTAINMENT_LOCK") {
          setRevealed(null);
          push("danger", `${t.state}: session keys zeroized. Recovery required.`);
        }
      }
    } catch (e) {
      push("danger", `Open failed: ${(e as Error).message}`);
    }
    setBusy(false);
    setPass("");
  };

  const tamper = () => {
    if (!blob) return;
    const ct = b64.decode(blob.ct);
    ct[Math.floor(Math.random() * ct.length)] ^= randomBytes(1)[0] | 1;
    const next = { ...blob, ct: b64.encode(ct) };
    saveBlob(next); setBlob(next);
    push("warn", "Ciphertext byte flipped. Next open should fail HMAC.");
  };

  const recover = () => {
    saveAttempts(0); setN(0); setRevealed(null);
    push("ok", "Recovery accepted. Reactor cooled.");
  };

  const destroy = () => {
    saveBlob(null); setBlob(null); saveAttempts(0); setN(0); setRevealed(null);
    push("info", "Vault wiped from localStorage.");
  };

  const exportBlob = () => {
    if (!blob) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(blob, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = `sxcrypt-vault-${blob.updated}.json`; a.click();
    URL.revokeObjectURL(url);
    push("ok", "Exported vault blob (header + ciphertext + MAC).");
  };

  const importBlob = async (f: File) => {
    try {
      const b = JSON.parse(await f.text()) as VaultBlob;
      saveBlob(b); setBlob(b); saveAttempts(0); setN(0);
      push("ok", `Imported vault (alg=${b.alg}).`);
    } catch (e) {
      push("danger", `Import failed: ${(e as Error).message}`);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-12 gap-10">
      <div className="lg:col-span-7 space-y-8">
        <header className="space-y-4">
          <div className="inline-block px-2 py-1 border border-reactor-glow/30 bg-reactor-glow/5 text-reactor-glow text-[10px] font-mono">
            §6 — LIVE VAULT · IN-BROWSER WEBCRYPTO
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight italic font-mono uppercase">
            Real Encryption.<br />Reactor-Defended.
          </h1>
          <p className="text-stone-400 text-sm leading-relaxed max-w-xl">
            This is not a simulation. Plaintext is sealed with{" "}
            <span className="text-reactor-glow font-mono">AES-256-GCM</span>,
            keys derived through{" "}
            <span className="text-reactor-glow font-mono">PBKDF2-SHA512 → HKDF-SHA512</span>{" "}
            and integrity-bound with{" "}
            <span className="text-reactor-glow font-mono">HMAC-SHA512</span>.
            Failed attempts compound PBKDF2 cost and reactor delay. Nothing leaves your browser.
          </p>
        </header>

        <div className="panel p-1">
          <div className="border border-white/5 p-6 space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-mono text-stone-500 uppercase">Reactor</p>
                <h2 className={`text-3xl font-mono font-bold ${c.text}`}>
                  n={tele.n} · R={fmt(tele.R)}
                </h2>
              </div>
              <div className={`px-3 py-1 font-mono font-bold border text-sm ${c.bg} ${c.border} ${c.text}`}>
                {tele.state}
              </div>
            </div>

            <StateMachine active={
              tele.state === "OPEN" || tele.state === "BACKOFF" ||
              tele.state === "QUARANTINE" || tele.state === "SCRAM_LOCK" ||
              tele.state === "CONTAINMENT_LOCK" ? tele.state : "QUARANTINE"} />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-reactor-line">
              {[
                ["PBKDF2", itersFor(n).toLocaleString()],
                ["DELAY", `${fmt(tele.D)} ms`],
                ["DECOYS", fmt(tele.B)],
                ["P(decoy)", fmt(tele.pDecoy)],
              ].map(([k, v]) => (
                <div key={k} className="bg-reactor-panel px-3 py-3">
                  <p className="text-[9px] font-mono text-stone-500 uppercase">{k}</p>
                  <p className="font-mono text-sm text-white truncate">{v}</p>
                </div>
              ))}
            </div>

            {/* Passphrase */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-stone-500 uppercase flex justify-between">
                <span>Passphrase</span>
                <span className={entropy < 40 ? "text-reactor-danger" : entropy < 70 ? "text-reactor-warn" : "text-reactor-glow"}>
                  ~{entropy} bits
                </span>
              </label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                disabled={busy || locked}
                placeholder="••••••••••••"
                className="w-full bg-black/40 border border-reactor-line px-3 py-3 font-mono text-sm text-white focus:border-reactor-glow/60 outline-none disabled:opacity-50"
              />
              <div className="h-1 bg-black/40 overflow-hidden">
                <div
                  className={`h-full transition-all ${entropy < 40 ? "bg-reactor-danger" : entropy < 70 ? "bg-reactor-warn" : "bg-reactor-glow"}`}
                  style={{ width: `${Math.min(100, entropy)}%` }}
                />
              </div>
            </div>

            {/* Plaintext (only when creating) */}
            {hydrated && !blob && (
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-stone-500 uppercase">
                  Plaintext payload (sealed locally; never sent anywhere)
                </label>
                <textarea
                  value={pt}
                  onChange={(e) => setPt(e.target.value)}
                  disabled={busy}
                  rows={5}
                  placeholder="The most important payload it will ever protect…"
                  className="w-full bg-black/40 border border-reactor-line px-3 py-3 font-mono text-sm text-white focus:border-reactor-glow/60 outline-none disabled:opacity-50"
                />
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {hydrated && !blob ? (
                <button
                  onClick={create}
                  disabled={busy}
                  className="h-12 col-span-2 sm:col-span-4 border border-reactor-glow/40 bg-reactor-glow/10 hover:bg-reactor-glow hover:text-black font-mono font-bold text-xs tracking-widest disabled:opacity-50"
                >
                  {busy ? "SEALING…" : "SEAL NEW VAULT"}
                </button>
              ) : (
                <>
                  <button
                    onClick={unlock}
                    disabled={busy || locked}
                    className="h-12 border border-reactor-glow/40 bg-reactor-glow/10 hover:bg-reactor-glow hover:text-black font-mono font-bold text-xs tracking-widest disabled:opacity-50"
                  >
                    {busy ? "DERIVING…" : "UNLOCK"}
                  </button>
                  <button
                    onClick={tamper}
                    disabled={busy}
                    className="h-12 border border-reactor-danger/40 bg-reactor-danger/10 hover:bg-reactor-danger hover:text-black font-mono font-bold text-xs tracking-widest disabled:opacity-50"
                  >
                    INJECT TAMPER
                  </button>
                  <button
                    onClick={recover}
                    className="h-12 border border-reactor-warn/40 bg-reactor-warn/10 hover:bg-reactor-warn hover:text-black font-mono font-bold text-xs tracking-widest"
                  >
                    RECOVER
                  </button>
                  <button
                    onClick={destroy}
                    className="h-12 border border-reactor-line hover:bg-white/10 font-mono font-bold text-xs tracking-widest"
                  >
                    WIPE VAULT
                  </button>
                </>
              )}
            </div>

            {blob && (
              <div className="flex gap-2 pt-2 border-t border-reactor-line">
                <button onClick={exportBlob} className="text-[10px] font-mono uppercase tracking-widest text-stone-400 hover:text-reactor-glow">
                  export blob ↓
                </button>
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 hover:text-reactor-glow cursor-pointer">
                  import blob ↑
                  <input type="file" accept="application/json" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) importBlob(f); }} />
                </label>
              </div>
            )}

            {revealed && (
              <div className="border border-reactor-glow/30 bg-reactor-glow/5 p-4">
                <p className="text-[10px] font-mono text-reactor-glow uppercase mb-2">
                  Decrypted payload (session-only)
                </p>
                <pre className="font-mono text-sm text-white whitespace-pre-wrap break-words">{revealed}</pre>
                <button
                  onClick={() => setRevealed(null)}
                  className="mt-3 text-[10px] font-mono uppercase tracking-widest text-stone-400 hover:text-reactor-danger"
                >
                  zeroize on screen ✕
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-mono font-bold text-white uppercase mb-2">Telemetry</h3>
          <div ref={logRef} className="h-48 overflow-y-auto bg-black/40 border border-reactor-line font-mono text-[11px] p-3 space-y-1 scanlines">
            {log.map((e, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-stone-600 shrink-0">{new Date(e.ts).toLocaleTimeString("en-GB")}</span>
                <span className={
                  e.kind === "danger" ? "text-reactor-danger"
                  : e.kind === "warn" ? "text-reactor-warn"
                  : e.kind === "decoy" ? "text-reactor-warn italic"
                  : e.kind === "ok" ? "text-reactor-glow"
                  : "text-stone-400"
                }>{e.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="lg:col-span-5 space-y-6">
        <section className="panel p-6">
          <h3 className="text-xs font-mono font-bold text-white uppercase mb-4">Vault Header</h3>
          {blob ? (
            <dl className="text-[11px] font-mono space-y-1 text-stone-400">
              <Row k="alg" v={blob.alg} />
              <Row k="kdf" v={`${blob.kdf} ×${blob.iters.toLocaleString()}`} />
              <Row k="created" v={new Date(blob.created).toISOString()} />
              <Row k="updated" v={new Date(blob.updated).toISOString()} />
              <Row k="nonce" v={blob.nonce.slice(0, 24) + "…"} />
              <Row k="hmac" v={blob.mac.slice(0, 28) + "…"} />
              <Row k="ct.len" v={`${b64.decode(blob.ct).length} bytes`} />
            </dl>
          ) : (
            <p className="text-stone-500 text-xs">No vault. Seal one to inspect the bound header.</p>
          )}
        </section>

        <section className="panel p-6 space-y-3">
          <h3 className="text-xs font-mono font-bold text-white uppercase">Defense Surface</h3>
          <ul className="text-[12px] text-stone-400 space-y-2">
            <Item label="Stolen blob" ok>Useless without the passphrase; PBKDF2 + HMAC bind every byte.</Item>
            <Item label="Offline brute-force" ok>Each failed unlock burns extra PBKDF2 work and reactor delay while preserving the original decrypt key schedule.</Item>
            <Item label="Header tampering" ok>JSON header is part of the HMAC. Any flip → TAMPER_EVIDENT.</Item>
            <Item label="Ciphertext flip" ok>AES-GCM auth tag + HMAC both reject. Try INJECT TAMPER.</Item>
            <Item label="Automation scripts" ok>Reactor delay D(n) compounds; SCRAM at R≥{PARAMS.T3}.</Item>
            <Item label="Forensic inspection" ok>Header carries no plaintext, no length oracle beyond ct size.</Item>
            <Item label="Decoy uncertainty" ok>P(decoy)=1−e^(−κB) returns plausible inert payloads.</Item>
            <Item label="Endpoint compromise (unlocked)" warn>Plaintext lives in RAM by necessity while you read it.</Item>
            <Item label="Keylogger / screen capture" warn>Out-of-band — no software-only cipher defends this.</Item>
            <Item label="Weak passphrase &lt; 40 bits" warn>The reactor slows guessing; it cannot resurrect entropy.</Item>
          </ul>
        </section>

        <section className="panel p-6">
          <h3 className="text-xs font-mono font-bold text-white uppercase mb-3">Operational Rules</h3>
          <ol className="text-[11px] font-mono text-stone-400 space-y-2 list-decimal list-inside">
            <li>All crypto runs in <span className="text-white">window.crypto.subtle</span>.</li>
            <li>No network calls. No telemetry. No analytics.</li>
            <li>Vault blob lives only in this browser's localStorage.</li>
            <li>WIPE VAULT zeroizes the blob from this device.</li>
            <li>Recovery resets attempts; it does not recover a forgotten passphrase.</li>
          </ol>
        </section>
      </aside>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3 justify-between border-b border-reactor-line/50 pb-1">
      <dt className="text-stone-500 uppercase">{k}</dt>
      <dd className="text-white text-right break-all">{v}</dd>
    </div>
  );
}

function Item({ label, ok, warn, children }: { label: string; ok?: boolean; warn?: boolean; children: React.ReactNode }) {
  const color = ok ? "text-reactor-glow" : warn ? "text-reactor-warn" : "text-reactor-danger";
  const mark = ok ? "✓" : warn ? "!" : "✕";
  return (
    <li className="flex gap-3">
      <span className={`${color} font-mono font-bold shrink-0`}>{mark}</span>
      <span><strong className="text-white font-mono text-[11px] uppercase tracking-wider">{label}</strong> — {children}</span>
    </li>
  );
}
