import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/threat-model")({
  head: () => ({
    meta: [
      { title: "Threat Model — SxCryptRx" },
      {
        name: "description",
        content:
          "What SxCryptRx defends against, what it does not, and the safety boundaries that hold the reactor inside the vault container.",
      },
      { property: "og:title", content: "Threat Model — SxCryptRx" },
      {
        property: "og:description",
        content:
          "In-scope adversaries, out-of-scope attacks, and non-negotiable safety principles.",
      },
    ],
  }),
  component: ThreatModel,
});

const inScope = [
  ["Stolen vault blob", "Offline copy in attacker hands."],
  ["Offline brute-force", "Unbounded compute against the blob."],
  ["Repeated wrong passphrases", "Interactive guessing escalates cost."],
  ["Automated guessing scripts", "Rate and timing anomalies feed A(n)."],
  ["Header tampering", "Detected by HMAC-SHA512 over header‖nonce‖AAD‖C‖tag."],
  ["Ciphertext modification", "Caught by AES-GCM tag and HMAC."],
  ["Stale blob replay", "Versioned headers and policy windows."],
  ["Casual forensic inspection", "Vault metadata reveals no plaintext."],
];

const outScope = [
  ["Compromised endpoint while unlocked", "Plaintext is in RAM by design."],
  ["Keyloggers", "Capture passphrase at the source."],
  ["Malware with root/admin", "Bypasses application boundaries entirely."],
  ["Screen capture of unlocked plaintext", "Out-of-band recording."],
  ["Genuinely weak passphrases", "Adaptive KDF cost cannot save 4-character secrets."],
  ["Social engineering", "Not a cryptographic problem."],
  ["Nation-state memory extraction", "Cold-boot, DRAM remanence post-unlock."],
  ["Side-channel attacks", "Power, EM, cache — needs separate hardening."],
  ["Malicious build / backdoored source", "Trust must originate outside the binary."],
];

const safety = [
  "Production encryption uses ONLY standard, audited primitives.",
  "Custom cryptography is isolated to research mode.",
  "No self-propagation.",
  "No external file deletion.",
  "No destructive payloads.",
  "No hidden network activity.",
  "No filesystem traversal outside the vault path.",
  "No persistence mechanisms beyond the vault file itself.",
  "No privilege escalation.",
  "All containment is vault-local.",
  "Destructive-sounding metaphors (SCRAM, meltdown) map only to safe internal state changes.",
];

function ThreatModel() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <header className="space-y-4 max-w-3xl">
        <div className="inline-block px-2 py-1 border border-reactor-danger/30 bg-reactor-danger/5 text-reactor-danger text-[10px] font-mono">
          §3 — THREAT MODEL
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white font-mono italic uppercase leading-tight">
          Honest Boundaries.
        </h1>
        <p className="text-stone-400 leading-relaxed">
          A defense model is only credible when its limits are stated as
          clearly as its claims. SxCryptRx defends what it can defend, and
          refuses to overstate the rest.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="panel p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-reactor-glow mb-4 flex items-center gap-2">
            <span className="size-2 bg-reactor-glow rounded-full" />
            In Scope — Defended
          </h2>
          <ul className="divide-y divide-reactor-line">
            {inScope.map(([k, v]) => (
              <li key={k} className="py-3">
                <p className="font-mono text-white text-sm">{k}</p>
                <p className="text-stone-500 text-[12px] mt-0.5">{v}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-reactor-danger mb-4 flex items-center gap-2">
            <span className="size-2 bg-reactor-danger rounded-full" />
            Out of Scope — Not Defended
          </h2>
          <ul className="divide-y divide-reactor-line">
            {outScope.map(([k, v]) => (
              <li key={k} className="py-3">
                <p className="font-mono text-white text-sm">{k}</p>
                <p className="text-stone-500 text-[12px] mt-0.5">{v}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel p-6 sm:p-8">
        <h2 className="font-mono text-xs uppercase tracking-widest text-reactor-warn mb-6">
          Safety Principles — Non-Negotiable
        </h2>
        <ol className="grid sm:grid-cols-2 gap-x-8 gap-y-3 list-decimal list-inside text-stone-300 text-sm">
          {safety.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-8 pt-6 border-t border-reactor-line text-stone-500 text-sm italic font-serif">
          The vault contains the defense. The defense never leaves the vault.
        </p>
      </section>
    </main>
  );
}
