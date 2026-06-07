import { createFileRoute, Link } from "@tanstack/react-router";
import { ReactorSimulator } from "@/components/ReactorSimulator";
import { M, MB } from "@/components/Tex";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SxCryptRx — Reactor Simulator" },
      {
        name: "description",
        content:
          "Interactive simulation of the SxCryptRx reactor: watch C(n), M(n), D(n), B(n) and the risk score R(n) react to failed unlock attempts.",
      },
      { property: "og:title", content: "SxCryptRx — Reactor Simulator" },
      {
        property: "og:description",
        content:
          "Simulate brute force, decoy branching, and tamper events against the SxCryptRx vault.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-12 gap-12">
      <div className="lg:col-span-7 space-y-8">
        <header className="space-y-4">
          <div className="inline-block px-2 py-1 border border-reactor-glow/30 bg-reactor-glow/5 text-reactor-glow text-[10px] font-mono">
            SYSTEM STATUS: QUARANTINE_READY
          </div>
          <h1 className="text-5xl font-extrabold text-white tracking-tight leading-tight italic font-mono uppercase">
            Reactor-Defended <br />
            Vault Architecture
          </h1>
          <p className="text-stone-400 max-w-xl text-lg leading-relaxed">
            Moving beyond static encryption. SxCryptRx wraps AES-256-GCM in an
            adaptive state-machine reactor that increases defensive friction{" "}
            <M>{`R(n)`}</M> as failed attempts accumulate. Vault-local.
            Non-destructive. Containment-first.
          </p>
          <p className="text-stone-500 max-w-xl text-sm leading-relaxed border-l-2 border-reactor-glow/40 pl-4">
            <span className="text-reactor-glow font-mono">CORE LAW —</span> A
            failed attempt must increase internal defensive cost, never external
            damage.
          </p>
        </header>

        <ReactorSimulator />
      </div>

      <aside className="lg:col-span-5 space-y-8">
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono font-bold text-white uppercase">
              Reactor Risk Function
            </h3>
            <span className="text-stone-600 text-[10px] font-mono italic">
              eq 5.7
            </span>
          </div>
          <MB>{String.raw`R(n) = w_c\log(1+\hat{C}) + w_m\log(1+M) + w_i\log(1+I) + w_d D + w_b U + w_a A + w_h H_{\mathrm{tamper}}`}</MB>
          <p className="text-[11px] text-stone-500 font-mono leading-relaxed mt-3">
            Crossing threshold <M>{`T_3`}</M> triggers{" "}
            <span className="text-reactor-danger">SCRAM_LOCK</span> and
            zeroizes session keys in process memory. No external files are
            touched.
          </p>
        </div>

        <section className="bg-white text-stone-900 p-8 rounded-sm shadow-xl font-serif">
          <div className="italic text-sm text-stone-500 mb-3">
            Chapter III — The Adaptive Cost Reaction
          </div>
          <div className="text-stone-900">
            <MB>{String.raw`\hat{C}(n) = \min\!\bigl(C_{\max},\ C_0\,\alpha^{n}\bigr)`}</MB>
          </div>
          <p className="text-sm leading-relaxed mt-4 text-stone-700">
            Each rejected attempt compounds KDF burn cost and reactor delay.
            Legitimate users incur bounded latency; offline brute-force pays
            geometric memory tax. The thesis is system-level:{" "}
            <strong>AES protects ciphertext, SxCryptRx protects the vault.</strong>
          </p>
          <Link
            to="/whitepaper"
            className="inline-block text-xs font-bold border-b-2 border-stone-900 pb-0.5 mt-5 hover:opacity-70 font-sans uppercase tracking-widest"
          >
            Read full whitepaper →
          </Link>
        </section>

        <div className="panel p-6">
          <h3 className="text-xs font-mono font-bold text-white mb-4 uppercase">
            Three Layers
          </h3>
          <ul className="space-y-3 text-[12px] font-mono text-stone-400">
            <li className="flex gap-3">
              <span className="text-reactor-glow">L-0</span>
              <span>
                <strong className="text-white">SxCryptRx-Core.</strong>{" "}
                Research-only AES-style SPN. Mathematics lab, not deployment.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-reactor-warn">L-1</span>
              <span>
                <strong className="text-white">SxCryptRx-Vault.</strong>{" "}
                Production pipeline: PBKDF2-SHA512 · AES-256-GCM · HKDF · HMAC-SHA512.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-reactor-danger">L-2</span>
              <span>
                <strong className="text-white">Reactor Defense.</strong>{" "}
                Adaptive cost, decoys, state machine, zeroization, recovery.
              </span>
            </li>
          </ul>
          <Link
            to="/architecture"
            className="mt-5 inline-block text-[10px] font-mono uppercase tracking-widest text-reactor-glow hover:underline"
          >
            View architecture →
          </Link>
        </div>
      </aside>
    </main>
  );
}
