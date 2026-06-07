import { createFileRoute } from "@tanstack/react-router";
import { M, MB } from "@/components/Tex";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture — SxCryptRx" },
      {
        name: "description",
        content:
          "The three layers of SxCryptRx: SxCryptRx-Core, SxCryptRx-Vault, and the Reactor Defense Model.",
      },
      { property: "og:title", content: "Architecture — SxCryptRx" },
      {
        property: "og:description",
        content:
          "Core, Vault, Reactor — how SxCryptRx wraps AES-256-GCM in an adaptive containment model.",
      },
    ],
  }),
  component: Architecture,
});

const layers = [
  {
    code: "L-0",
    color: "reactor-glow",
    title: "SxCryptRx-Core",
    sub: "Research-only AES-style SPN cipher",
    body: (
      <>
        <p>
          A pedagogical block cipher: 128/192/256-bit keys, 12/14/16 rounds,{" "}
          <M>{`\\mathrm{GF}(2^{8})`}</M> S-box, ShiftRows-like permutation,
          MixColumns-like diffusion, AddRoundKey.
        </p>
        <MB>{String.raw`S_{r+1} = \mathrm{AddRoundKey}\bigl(\mathrm{MixColumns}(\mathrm{ShiftRows}(\mathrm{SubBytes}(S_r))),\ K_r\bigr)`}</MB>
        <p className="text-stone-500 text-[11px] font-mono">
          NOT FOR PRODUCTION. SxCryptRx-Core exists to study avalanche, branch
          number, active S-box counts, and key schedule entropy.
        </p>
      </>
    ),
    primitives: ["SubBytes", "ShiftRows*", "MixColumns*", "AddRoundKey"],
  },
  {
    code: "L-1",
    color: "reactor-warn",
    title: "SxCryptRx-Vault",
    sub: "Production pipeline — audited primitives only",
    body: (
      <>
        <MB>{String.raw`K_{\mathrm{master}} = \mathrm{PBKDF2\text{-}SHA512}(P,\ s,\ I_0)`}</MB>
        <MB>{String.raw`K_{\mathrm{enc}}\,\|\,K_{\mathrm{mac}}\,\|\,K_{\mathrm{decoy}} = \mathrm{HKDF\text{-}SHA512}(K_{\mathrm{master}})`}</MB>
        <MB>{String.raw`C = \mathrm{AES\text{-}256\text{-}GCM}(K_{\mathrm{enc}},\ \mathrm{nonce},\ \mathrm{pt},\ \mathrm{AAD})`}</MB>
        <p>
          Every byte of header, nonce, and AAD is bound into an external
          HMAC-SHA512 tag for tamper evidence.
        </p>
      </>
    ),
    primitives: ["PBKDF2-SHA512", "AES-256-GCM", "HKDF-SHA512", "HMAC-SHA512"],
  },
  {
    code: "L-2",
    color: "reactor-danger",
    title: "Reactor Defense",
    sub: "Adaptive cost, decoys, state machine, zeroization",
    body: (
      <>
        <MB>{String.raw`M(n) = \min(M_{\max},\ M_0\,2^{n})\qquad D(n) = \min(D_{\max},\ D_0\,\beta^{n})`}</MB>
        <MB>{String.raw`B(n) = \min(B_{\max},\ 2^{n})\qquad U(n) = \log_2(B(n)+1)`}</MB>
        <p>
          On state escalation, session keys are zeroized in process memory.
          Containment is strictly vault-local: no external file, folder, drive,
          or network endpoint is ever modified.
        </p>
      </>
    ),
    primitives: ["BACKOFF", "QUARANTINE", "SCRAM_LOCK", "CONTAINMENT_LOCK"],
  },
];

function Architecture() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <header className="space-y-4 max-w-3xl">
        <div className="inline-block px-2 py-1 border border-reactor-glow/30 bg-reactor-glow/5 text-reactor-glow text-[10px] font-mono">
          §2 — SYSTEM OVERVIEW
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white font-mono italic uppercase leading-tight">
          Three Layers,
          <br />
          One Boundary.
        </h1>
        <p className="text-stone-400 leading-relaxed">
          SxCryptRx is a stack, not a cipher. The research core studies AES-style
          design. The vault layer ships production encryption built only from
          audited primitives. The reactor wraps both in an adaptive defense
          model whose every action stays inside the vault container.
        </p>
      </header>

      {/* Stack diagram */}
      <div className="panel p-6 sm:p-8 space-y-3">
        {layers
          .slice()
          .reverse()
          .map((l) => (
            <div
              key={l.code}
              className={`border border-${l.color}/30 bg-${l.color}/5 px-5 py-4 flex items-center justify-between font-mono`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-${l.color} text-xs font-bold`}>
                  {l.code}
                </span>
                <span className="text-white font-bold">{l.title}</span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-stone-500 hidden sm:inline">
                {l.sub}
              </span>
            </div>
          ))}
        <p className="text-[10px] font-mono text-stone-600 pt-3 border-t border-reactor-line">
          STACK ORDER: L-2 wraps L-1 wraps L-0. Production data only ever
          touches L-1.
        </p>
      </div>

      {/* Per-layer cards */}
      <div className="grid lg:grid-cols-3 gap-6">
        {layers.map((l) => (
          <article
            key={l.code}
            className="panel p-6 space-y-4 flex flex-col"
          >
            <div className="flex items-baseline justify-between border-b border-reactor-line pb-3">
              <h2 className="font-mono text-white font-bold text-lg">
                {l.title}
              </h2>
              <span className={`text-${l.color} font-mono text-xs`}>
                {l.code}
              </span>
            </div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-stone-500">
              {l.sub}
            </p>
            <div className="text-sm text-stone-300 space-y-2 leading-relaxed flex-1">
              {l.body}
            </div>
            <div className="flex flex-wrap gap-2 pt-3 border-t border-reactor-line">
              {l.primitives.map((p) => (
                <span
                  key={p}
                  className="text-[10px] font-mono px-2 py-1 border border-reactor-line bg-black/30 text-stone-400"
                >
                  {p}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      {/* Seal / Open flow */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="panel p-6">
          <h3 className="font-mono text-xs uppercase tracking-widest text-reactor-glow mb-4">
            Seal Operation
          </h3>
          <ol className="space-y-2 text-sm text-stone-400 font-mono text-[12px] leading-relaxed list-decimal list-inside">
            <li>Generate vault_id, salt, nonce, policy header.</li>
            <li>Derive K_master ← PBKDF2-SHA512(P, s, I0).</li>
            <li>HKDF-SHA512 → K_enc · K_mac · K_decoy · K_audit.</li>
            <li>C, tag_gcm ← AES-256-GCM(K_enc, nonce, pt, AAD=header).</li>
            <li>tag_hmac ← HMAC-SHA512(K_mac, header ‖ nonce ‖ C ‖ tag_gcm).</li>
            <li>Atomic-write blob. Zeroize all transient secrets.</li>
          </ol>
        </div>
        <div className="panel p-6">
          <h3 className="font-mono text-xs uppercase tracking-widest text-reactor-warn mb-4">
            Open Operation
          </h3>
          <ol className="space-y-2 text-sm text-stone-400 font-mono text-[12px] leading-relaxed list-decimal list-inside">
            <li>Load header, reactor state, attempt count n.</li>
            <li>Compute C(n), M(n), D(n), B(n), R(n).</li>
            <li>Sleep D(n). Reject early if SCRAM / CONTAINMENT.</li>
            <li>Derive K_master with current cost; HKDF subkeys.</li>
            <li>Constant-time verify tag_hmac. On mismatch → TAMPER_EVIDENT.</li>
            <li>AES-GCM decrypt. On success: reset counters. On fail: ++n, escalate, zeroize.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
