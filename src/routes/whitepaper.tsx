import { createFileRoute } from "@tanstack/react-router";
import { M, MB } from "@/components/Tex";
import { type ReactNode } from "react";

export const Route = createFileRoute("/whitepaper")({
  head: () => ({
    meta: [
      { title: "Whitepaper — SxCryptRx" },
      {
        name: "description",
        content:
          "Final-stage technical whitepaper for SxCryptRx: threat model, mathematical reactor model, state machine, key derivation, and evaluation methodology.",
      },
      { property: "og:title", content: "SxCryptRx Whitepaper" },
      {
        property: "og:description",
        content:
          "Formal definitions, equations, and safety boundaries for the SxCryptRx reactor-defended vault.",
      },
    ],
  }),
  component: Whitepaper,
});

interface Section {
  id: string;
  num: string;
  title: string;
  body: ReactNode;
}

const sections: Section[] = [
  {
    id: "abstract",
    num: "0",
    title: "Abstract",
    body: (
      <>
        <p>
          SxCryptRx is a defensive cryptographic vault built around audited
          primitives, augmented by a reactor-inspired adaptive defense layer.
          It does <em>not</em> replace AES and makes no claim that any included
          custom cipher is mathematically stronger than AES. Its thesis is
          system-level:
        </p>
        <blockquote className="border-l-2 border-reactor-glow pl-4 my-4 italic text-stone-300">
          AES protects ciphertext. SxCryptRx builds a full defensive vault system
          around AES using adaptive containment, attacker-cost escalation,
          decoy uncertainty, key zeroization, tamper evidence, and
          recovery-controlled lock states.
        </blockquote>
        <p>
          A failed access attempt does not damage external systems. It
          triggers an internal defensive chain reaction: computational cost,
          memory cost, delay, and decoy uncertainty grow while containment
          state escalates. The system is <strong>non-destructive,
          defensive-only, and vault-local</strong> at all times.
        </p>
      </>
    ),
  },
  {
    id: "thesis",
    num: "1",
    title: "Core Law",
    body: (
      <>
        <blockquote className="border-l-2 border-reactor-glow pl-4 my-4 italic text-stone-300">
          A failed attempt must increase internal defensive cost, never
          external damage.
        </blockquote>
        <p>Every design decision in this document derives from that law.</p>
      </>
    ),
  },
  {
    id: "threat",
    num: "3",
    title: "Threat Model",
    body: (
      <>
        <p className="font-mono text-xs uppercase tracking-widest text-reactor-glow mb-2">
          IN SCOPE
        </p>
        <ul className="list-disc list-inside text-stone-400 space-y-1 mb-4">
          <li>Stolen sealed vault blobs and offline brute-force.</li>
          <li>Repeated wrong passphrases, scripted guessing.</li>
          <li>Header, nonce, AAD, or ciphertext tampering.</li>
          <li>Replay of stale blobs (per policy).</li>
        </ul>
        <p className="font-mono text-xs uppercase tracking-widest text-reactor-danger mb-2">
          OUT OF SCOPE
        </p>
        <ul className="list-disc list-inside text-stone-400 space-y-1">
          <li>Compromised endpoint while the vault is open.</li>
          <li>Keyloggers, screen capture, malware with root.</li>
          <li>Genuinely weak passphrases; social engineering.</li>
          <li>Side-channel attacks unless separately hardened.</li>
        </ul>
      </>
    ),
  },
  {
    id: "reactor",
    num: "5",
    title: "Mathematical Reactor Model",
    body: (
      <>
        <p>Adaptive computational cost, capped:</p>
        <MB>{String.raw`\hat{C}(n) = \min\!\bigl(C_{\max},\ C_0\,\alpha^{n}\bigr),\quad \alpha>1`}</MB>
        <p>Memory-model pressure and KDF burn iterations:</p>
        <MB>{String.raw`M(n) = \min(M_{\max},\ M_0\,2^{n})\qquad I(n) = \min(I_{\max},\ I_0\,\gamma^{n})`}</MB>
        <p>Defensive delay, bounded to protect legitimate users:</p>
        <MB>{String.raw`D(n) = \min(D_{\max},\ D_0\,\beta^{n})`}</MB>
        <p>Decoy branching and attacker uncertainty:</p>
        <MB>{String.raw`B(n) = \min(B_{\max},\ 2^{n})\quad U(n) = \log_2(B(n)+1)\quad P_{\mathrm{decoy}}(n) = 1 - e^{-\kappa B(n)}`}</MB>
        <p>Composite reactor risk score:</p>
        <MB>{String.raw`R(n) = w_c\log(1+\hat{C}) + w_m\log(1+M) + w_i\log(1+I) + w_d D + w_b U + w_a A(n) + w_h H_{\mathrm{tamper}}`}</MB>
        <p>
          The anomaly term <M>{`A(n)`}</M> aggregates rate, geographic,
          device, timing, integrity, and replay signals.
        </p>
      </>
    ),
  },
  {
    id: "states",
    num: "6",
    title: "State Machine",
    body: (
      <>
        <MB>{String.raw`\mathrm{State}(n) = \begin{cases}\texttt{OPEN}, & R(n) < T_1 \\ \texttt{BACKOFF}, & T_1 \le R(n) < T_2 \\ \texttt{QUARANTINE}, & T_2 \le R(n) < T_3 \\ \texttt{SCRAM\_LOCK}, & T_3 \le R(n) < T_4 \\ \texttt{CONTAINMENT\_LOCK}, & R(n) \ge T_4 \end{cases}`}</MB>
        <p>
          SCRAM_LOCK and CONTAINMENT_LOCK both require an out-of-band recovery
          credential. They trigger:
        </p>
        <MB>{String.raw`\mathrm{Zeroize}\bigl(K_{\mathrm{master}},\ K_{\mathrm{enc}},\ K_{\mathrm{mac}},\ K_{\mathrm{decoy}},\ \text{plaintext\_cache},\ \text{passphrase\_buffer}\bigr)`}</MB>
        <p className="text-stone-500 text-sm">
          Zeroization affects <strong>only</strong> in-process secrets. No
          external file, folder, drive, vault, or network resource is ever
          modified. The word <em>meltdown</em> is used only as a visual
          metaphor for maximum internal containment.
        </p>
      </>
    ),
  },
  {
    id: "pipeline",
    num: "7",
    title: "Cryptographic Pipeline",
    body: (
      <>
        <MB>{String.raw`K_{\mathrm{master}} = \mathrm{PBKDF2\text{-}SHA512}(P,\ s,\ I_0)`}</MB>
        <MB>{String.raw`K_{\mathrm{enc}}\,\|\,K_{\mathrm{mac}}\,\|\,K_{\mathrm{decoy}}\,\|\,K_{\mathrm{audit}} = \mathrm{HKDF\text{-}SHA512}(K_{\mathrm{master}},\ \texttt{"SxCryptRx-Vault-v2"})`}</MB>
        <MB>{String.raw`C = \mathrm{AES\text{-}256\text{-}GCM.Encrypt}(K_{\mathrm{enc}},\ \mathrm{nonce},\ \mathrm{pt},\ \mathrm{AAD})`}</MB>
        <MB>{String.raw`\mathrm{tag}_{\mathrm{hmac}} = \mathrm{HMAC\text{-}SHA512}(K_{\mathrm{mac}},\ \mathrm{header}\,\|\,\mathrm{nonce}\,\|\,\mathrm{AAD}\,\|\,C\,\|\,\mathrm{tag}_{\mathrm{gcm}})`}</MB>
        <p>
          Verification is constant-time. On failure the reactor enters{" "}
          <code className="text-reactor-danger">TAMPER_EVIDENT</code> and may
          escalate per policy.
        </p>
      </>
    ),
  },
  {
    id: "core",
    num: "9",
    title: "SxCryptRx-Core (Research Only)",
    body: (
      <>
        <p className="text-reactor-warn font-mono text-xs uppercase tracking-widest">
          Warning — research cipher; not for production
        </p>
        <p>State and round function:</p>
        <MB>{String.raw`S_r \in \mathrm{GF}(2^8)^{4 \times 4}`}</MB>
        <MB>{String.raw`S_{r+1} = \mathrm{AddRoundKey}\bigl(\mathrm{MixColumns}(\mathrm{ShiftRows}(\mathrm{SubBytes}(S_r))),\ K_r\bigr)`}</MB>
        <p>S-box:</p>
        <MB>{String.raw`S(x) = A \cdot \mathrm{Inv}_{\mathrm{GF}(2^8)}(x) \oplus c,\quad \mathrm{Inv}(0) := 0`}</MB>
        <p>Strict Avalanche Criterion target:</p>
        <MB>{String.raw`\Pr\bigl[E_K(x)_j \neq E_K(x \oplus e_i)_j\bigr] \approx \tfrac{1}{2}`}</MB>
        <p>
          S-box quality metrics studied: nonlinearity{" "}
          <M>{`\\mathrm{NL}(S)`}</M>, differential uniformity{" "}
          <M>{`\\mathrm{DU}(S)`}</M>, algebraic degree, and diffusion-layer
          branch number <M>{`B_L`}</M>.
        </p>
      </>
    ),
  },
  {
    id: "more-than-aes",
    num: "10",
    title: "“More Than AES” — Stated Honestly",
    body: (
      <>
        <p>
          AES is a standardized cipher. SxCryptRx-Vault uses AES-256-GCM for
          actual encryption. SxCryptRx is <em>more than AES</em> at the{" "}
          <strong>system level</strong>: adaptive KDF burn, memory and delay
          reaction, decoy branching, HMAC tamper evidence, HKDF separation,
          SCRAM emergency lock, containment, session zeroization, and an
          enforced vault-local boundary.
        </p>
        <p className="text-stone-400 text-sm border-l-2 border-reactor-warn/60 pl-4 my-4">
          SxCryptRx-Core is a research cipher used to study AES-style design.
          SxCryptRx-Vault relies on AES-256-GCM for production. The innovation
          of SxCryptRx is not replacing AES, but building a mathematically
          governed reactor-defense layer around encrypted vaults.
        </p>
      </>
    ),
  },
  {
    id: "safety",
    num: "11",
    title: "Safety Principles (Non-Negotiable)",
    body: (
      <ul className="list-decimal list-inside space-y-1 text-stone-400">
        <li>Production encryption uses only audited primitives.</li>
        <li>Custom cryptography is isolated to research mode.</li>
        <li>No self-propagation.</li>
        <li>No external file deletion.</li>
        <li>No destructive payloads.</li>
        <li>No hidden network activity.</li>
        <li>No filesystem traversal outside the vault path.</li>
        <li>No persistence beyond the vault file itself.</li>
        <li>No privilege escalation.</li>
        <li>All containment is vault-local.</li>
        <li>
          Destructive-sounding metaphors map only to safe internal state
          changes — never to external effects.
        </li>
      </ul>
    ),
  },
  {
    id: "impl",
    num: "13",
    title: "Implementation Requirements",
    body: (
      <ul className="list-disc list-inside space-y-1 text-stone-400">
        <li>Constant-time comparison for all MAC and tag checks.</li>
        <li>Cryptographically secure randomness for salts, nonces, vault IDs.</li>
        <li>Never reuse an AES-GCM nonce with the same key.</li>
        <li>Version every vault header; bind metadata into AAD.</li>
        <li>Separate keys via HKDF; one purpose per derived key.</li>
        <li>Zeroize sensitive memory where the runtime permits.</li>
        <li>Owner-only file permissions; atomic vault writes.</li>
        <li>Vault-local, privacy-preserving audit logs.</li>
        <li>Dangerous operations impossible by design, not merely disabled.</li>
        <li>Separate research and production modes; production = audited only.</li>
      </ul>
    ),
  },
  {
    id: "conclusion",
    num: "15",
    title: "Conclusion",
    body: (
      <>
        <p>
          SxCryptRx presents a disciplined, mathematically governed defense
          layer wrapped around standard cryptographic primitives. Its
          contribution is not a new block cipher — the included SxCryptRx-Core
          is openly research only — but a reactor model that turns each
          failed attempt into measurable, bounded, internal cost growth, while
          honoring a strict safety contract.
        </p>
        <blockquote className="border-l-2 border-reactor-glow pl-4 my-4 italic text-stone-200">
          A failed attempt must increase internal defensive cost, never
          external damage.
        </blockquote>
        <p>
          AES continues to protect ciphertext. SxCryptRx protects the vault
          around it.
        </p>
      </>
    ),
  },
];

function Whitepaper() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-12 gap-10">
      {/* TOC */}
      <aside className="lg:col-span-3 lg:sticky lg:top-24 lg:self-start">
        <div className="panel p-5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-reactor-glow mb-3">
            Table of Contents
          </p>
          <ol className="space-y-2 text-[12px] font-mono">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-stone-400 hover:text-reactor-glow flex gap-2"
                >
                  <span className="text-stone-600 w-5">§{s.num}</span>
                  <span>{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="mt-5 pt-4 border-t border-reactor-line">
            <a
              href="/whitepaper"
              className="text-[10px] font-mono uppercase tracking-widest text-stone-500 hover:text-reactor-glow"
            >
              Full whitepaper ↗
            </a>
          </div>
        </div>
      </aside>

      {/* Body */}
      <article className="lg:col-span-9 space-y-12">
        <header className="space-y-3 border-b border-reactor-line pb-8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-reactor-glow">
            Final Version · 2026 · by Bala
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white font-mono italic uppercase leading-tight">
            SxCryptRx: Reactor-Defended
            <br />
            Cryptographic Vault
          </h1>
          <p className="text-stone-400 text-lg max-w-2xl">
            A final-stage technical whitepaper on adaptive, containment-oriented
            vault defense.
          </p>
        </header>

        {sections.map((s) => (
          <section
            key={s.id}
            id={s.id}
            className="scroll-mt-24 space-y-3"
          >
            <div className="flex items-baseline gap-3 border-b border-reactor-line pb-2">
              <span className="text-reactor-glow font-mono text-xs">
                §{s.num}
              </span>
              <h2 className="text-2xl font-bold text-white font-mono uppercase">
                {s.title}
              </h2>
            </div>
            <div className="text-stone-300 leading-relaxed space-y-3 max-w-3xl">
              {s.body}
            </div>
          </section>
        ))}
      </article>
    </main>
  );
}
