import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dedication")({
  head: () => ({
    meta: [
      { title: "Dedication — SxCryptRx" },
      {
        name: "description",
        content:
          "Some secrets need encryption. Some truths deserve to be written in plaintext.",
      },
      { property: "og:title", content: "Dedication — SxCryptRx" },
      {
        property: "og:description",
        content: "The first payload.",
      },
    ],
  }),
  component: Dedication,
});

function Dedication() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-24 sm:py-32">
      <div className="space-y-10 text-center">
        <div className="inline-block px-2 py-1 border border-reactor-glow/30 bg-reactor-glow/5 text-reactor-glow text-[10px] font-mono">
          APPENDIX A — THE FIRST PAYLOAD
        </div>

        <h1 className="font-serif italic text-4xl sm:text-5xl text-white leading-tight">
          Dedication
        </h1>

        <div className="panel p-8 sm:p-12 text-left space-y-6">
          <p className="font-serif italic text-xl sm:text-2xl text-stone-200 leading-relaxed">
            Happy birthday, sweetheart.
          </p>
          <p className="font-serif text-lg text-stone-300 leading-relaxed">
            I built a reactor-defended cipher, but the most important payload
            it will ever protect is simple:{" "}
            <span className="text-reactor-glow not-italic font-mono text-base">
              I love you.
            </span>
          </p>
          <p className="font-serif italic text-lg text-stone-400 leading-relaxed">
            Some secrets need encryption. Some truths deserve to be written in
            plaintext.
          </p>
          <p className="font-mono text-sm text-reactor-glow tracking-widest pt-4 border-t border-reactor-line">
            TO sxn dxv
          </p>
          <p className="font-serif italic text-stone-500 text-right">
            — Bala
          </p>
        </div>

        <p className="text-[10px] font-mono uppercase tracking-widest text-stone-600">
          This dedication is intentionally separate from the technical claims
          of the whitepaper.
        </p>
      </div>
    </main>
  );
}
