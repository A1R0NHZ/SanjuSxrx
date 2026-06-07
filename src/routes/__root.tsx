import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-reactor-glow text-xs uppercase tracking-widest">
          SIGNAL_LOST
        </p>
        <h1 className="font-mono text-7xl font-bold text-white mt-2">404</h1>
        <p className="mt-4 text-sm text-stone-400">
          That route is not in the reactor manifest.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block px-4 py-2 border border-reactor-glow/30 bg-reactor-glow/5 text-reactor-glow font-mono text-xs uppercase tracking-widest hover:bg-reactor-glow hover:text-black transition-all"
        >
          Return to core
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-reactor-danger text-xs uppercase tracking-widest">
          CORE_FAULT
        </p>
        <h1 className="font-mono text-2xl font-bold text-white mt-2">
          Reactor entered fault state
        </h1>
        <p className="mt-2 text-sm text-stone-400">
          A non-destructive fault was caught. Containment held.
        </p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-block px-4 py-2 border border-reactor-glow/30 bg-reactor-glow/5 text-reactor-glow font-mono text-xs uppercase tracking-widest hover:bg-reactor-glow hover:text-black transition-all"
        >
          Re-key & retry
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SxCryptRx — Reactor-Defended Cryptographic Vault" },
      {
        name: "description",
        content:
          "SxCryptRx is a reactor-defended vault that wraps AES-256-GCM with adaptive cost, decoy uncertainty, and vault-local containment.",
      },
      { name: "author", content: "Bala" },
      { property: "og:title", content: "SxCryptRx — Reactor-Defended Cryptographic Vault" },
      {
        property: "og:description",
        content:
          "Adaptive cost, decoy uncertainty, tamper evidence, and containment-state defense around AES-256-GCM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css",
        integrity: "sha384-5TcZemv2l/9On385z///+d7MSYlvIEw9FuZTIdZ14vJLqWphw7e7ZPuOiCHJcFCP",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-reactor-bg text-stone-300 font-sans flex flex-col">
        <Nav />
        <div className="flex-1">
          <Outlet />
        </div>
        <Footer />
      </div>
    </QueryClientProvider>
  );
}
