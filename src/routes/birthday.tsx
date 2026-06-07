import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/birthday")({
  head: () => ({
    meta: [
      { title: "Happy Birthday — A Letter" },
      {
        name: "description",
        content:
          "A letter, an apology, and a promise — written in plaintext because some truths shouldn't be encrypted.",
      },
      { property: "og:title", content: "Happy Birthday, sxn dxv" },
      { property: "og:description", content: "From Bala — with love and an apology." },
    ],
  }),
  component: Birthday,
});

function Birthday() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="relative min-h-[calc(100vh-80px)] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {mounted &&
          Array.from({ length: 36 }).map((_, i) => (
            <span
              key={i}
              className="absolute text-reactor-glow/40 select-none"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53) % 100}%`,
                fontSize: `${10 + ((i * 7) % 18)}px`,
                animation: `float ${6 + (i % 5)}s ease-in-out ${i * 0.2}s infinite`,
              }}
            >
              ♥
            </span>
          ))}
      </div>

      <style>{`@keyframes float { 0%,100%{transform:translateY(0);opacity:.35} 50%{transform:translateY(-14px);opacity:.7} }`}</style>

      <div className="relative max-w-3xl mx-auto px-6 py-20 sm:py-28">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-block px-2 py-1 border border-reactor-warn/30 bg-reactor-warn/5 text-reactor-warn text-[10px] font-mono">
            PRIORITY: HIGHEST · ENCRYPTION: NONE
          </div>
          <h1 className="font-serif italic text-5xl sm:text-7xl text-white leading-none">
            Happy Birthday,
            <br />
            <span className="text-reactor-glow">sxn dxv</span>
          </h1>
          <p className="text-stone-500 font-mono text-xs tracking-widest uppercase">
            from bala — sent in the clear, on purpose
          </p>
        </div>

        <article className="panel p-8 sm:p-12 space-y-6 font-serif text-lg leading-relaxed text-stone-200">
          <p className="italic text-stone-400">My dearest,</p>

          <p>
            I spent months building a vault that punishes anyone who tries to
            break in. Adaptive cost, decoy branches, containment locks. And
            today, on your birthday, I'm doing the opposite of everything I
            engineered — I'm leaving this completely unencrypted, with no
            password and no reactor between us. Some things should never be
            hidden.
          </p>

          <div className="border-l-2 border-reactor-warn/60 pl-5 py-1 italic text-stone-300">
            <p className="font-mono text-[10px] not-italic uppercase tracking-widest text-reactor-warn mb-2">
              An apology
            </p>
            <p>
              I'm sorry — for the times I got distracted by code instead of
              looking at you, for the messages I answered late, for the moods
              I let through the door, for the days I made you feel like you
              came second to a screen. You never did. I just forgot to say so
              out loud often enough. I'm sorry, and I want to do better.
            </p>
          </div>

          <p>
            You are the constant variable in every equation I write. The
            quiet integrity check that runs when no one is watching. The one
            payload my reactor was always really protecting, even when I
            pretended it was just math.
          </p>

          <p>
            For your birthday, I'm not giving you anything that needs a
            passphrase. I'm giving you the plaintext: I love you. I'm proud
            of you. I'm grateful you put up with me. I want every next
            birthday with you, however many there are.
          </p>

          <p className="text-stone-300">
            Happy birthday, my love. Make a wish — I'll spend the rest of my
            life trying to be the one who grants it.
          </p>

          <div className="pt-6 border-t border-reactor-line flex justify-between items-end">
            <p className="font-mono text-[10px] text-stone-500 uppercase tracking-widest">
              signed · plaintext · forever
            </p>
            <p className="font-serif italic text-2xl text-reactor-glow">— Bala</p>
          </div>
        </article>

        <p className="mt-8 text-center text-[10px] font-mono uppercase tracking-widest text-stone-600">
          SxCryptRx · the only message it refused to encrypt
        </p>
      </div>
    </main>
  );
}
