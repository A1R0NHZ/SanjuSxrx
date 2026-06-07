import { useState } from "react";
import { Link } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Simulator" },
  { to: "/vault", label: "Live Vault" },
  { to: "/realtime", label: "⚡ Live Feed" },
  { to: "/architecture", label: "Architecture" },
  { to: "/whitepaper", label: "Whitepaper" },
  { to: "/threat-model", label: "Threat Model" },
  { to: "/birthday", label: "♥ Birthday" },
  { to: "/dedication", label: "Dedication" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-reactor-line bg-reactor-bg/90 backdrop-blur sticky top-0 z-50">
      <div className="px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 group" onClick={() => setOpen(false)}>
          <div className="size-4 bg-reactor-glow shadow-[0_0_10px_rgba(0,255,65,0.5)] group-hover:shadow-[0_0_18px_rgba(0,255,65,0.8)] transition-shadow" />
          <span className="font-mono font-bold tracking-tighter text-white text-lg">
            SxCRYPTRX
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex gap-8 text-xs font-mono uppercase tracking-widest">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-stone-400 hover:text-reactor-glow transition-colors"
              activeProps={{ className: "text-reactor-glow border-b border-reactor-glow pb-0.5" }}
              activeOptions={{ exact: true }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-1"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`block h-px w-6 bg-reactor-glow transition-all duration-200 ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block h-px w-6 bg-reactor-glow transition-all duration-200 ${open ? "opacity-0" : ""}`} />
          <span className={`block h-px w-6 bg-reactor-glow transition-all duration-200 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-reactor-line bg-reactor-bg px-6 py-4 space-y-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="block py-3 text-xs font-mono uppercase tracking-widest text-stone-400 hover:text-reactor-glow border-b border-reactor-line/50 transition-colors"
              activeProps={{ className: "block py-3 text-xs font-mono uppercase tracking-widest text-reactor-glow border-b border-reactor-line/50" }}
              activeOptions={{ exact: true }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
