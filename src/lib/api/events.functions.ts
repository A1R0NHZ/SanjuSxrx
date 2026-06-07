import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface ReactorEvent {
  id: number;
  ts: number;
  kind: string;
  state: string;
  n: number;
  r_score: number;
  detail: string;
}

export interface EventStats {
  total: number;
  byKind: { kind: string; cnt: number }[];
  byState: { state: string; cnt: number }[];
}

const KINDS = ["attempt", "tamper", "decoy", "zeroize", "reset", "info"] as const;

// ── Push a new event ──────────────────────────────────────────────────────
export const pushEvent = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        kind: z.enum(KINDS),
        state: z.string().max(32),
        n: z.number().int().min(0),
        r_score: z.number(),
        detail: z.string().max(512).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { getDb } = await import("@/lib/db.server");
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO reactor_events (ts, kind, state, n, r_score, detail)
            VALUES (:ts, :kind, :state, :n, :r_score, :detail)`,
      args: {
        ts: Date.now(),
        kind: data.kind,
        state: data.state,
        n: data.n,
        r_score: data.r_score,
        detail: data.detail ?? "",
      },
    });
    return { ok: true };
  });

// ── Fetch latest events ───────────────────────────────────────────────────
export const fetchEvents = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).default(80) }).parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const { getDb } = await import("@/lib/db.server");
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT id, ts, kind, state, n, r_score, detail
            FROM reactor_events
            ORDER BY id DESC
            LIMIT :limit`,
      args: { limit: data.limit },
    });
    const events: ReactorEvent[] = result.rows.map((r) => ({
      id: Number(r.id),
      ts: Number(r.ts),
      kind: String(r.kind),
      state: String(r.state),
      n: Number(r.n),
      r_score: Number(r.r_score),
      detail: String(r.detail ?? ""),
    }));
    return { events };
  });

// ── Stats summary ─────────────────────────────────────────────────────────
export const fetchStats = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({}).parse(data ?? {}))
  .handler(async () => {
    const { getDb } = await import("@/lib/db.server");
    const db = getDb();
    const result = await db.execute(
      `SELECT kind, state FROM reactor_events LIMIT 10000`,
    );
    const byKindMap = new Map<string, number>();
    const byStateMap = new Map<string, number>();
    for (const r of result.rows) {
      const k = String(r.kind);
      const s = String(r.state);
      byKindMap.set(k, (byKindMap.get(k) ?? 0) + 1);
      byStateMap.set(s, (byStateMap.get(s) ?? 0) + 1);
    }
    const stats: EventStats = {
      total: result.rows.length,
      byKind: [...byKindMap.entries()]
        .map(([kind, cnt]) => ({ kind, cnt }))
        .sort((a, b) => b.cnt - a.cnt),
      byState: [...byStateMap.entries()]
        .map(([state, cnt]) => ({ state, cnt }))
        .sort((a, b) => b.cnt - a.cnt),
    };
    return stats;
  });

// ── Clear all events ──────────────────────────────────────────────────────
export const clearEvents = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ confirmed: z.boolean() }).parse(data))
  .handler(async () => {
    return { ok: false, message: "Global feed clearing is disabled in production." };
  });
