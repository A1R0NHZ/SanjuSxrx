import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

// 1. Check table exists
const schema = await db.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='reactor_events'",
);
if (!schema.rows.length) {
  console.error("FAIL: reactor_events table not found");
  process.exit(1);
}
console.log("✓ table exists:", schema.rows[0].name);

// 2. Insert a test row
const ins = await db.execute({
  sql: "INSERT INTO reactor_events (ts,kind,state,n,r_score,detail) VALUES (?,?,?,?,?,?)",
  args: [Date.now(), "info", "OPEN", 0, 1.0, "kiro-verify"],
});
console.log("✓ insert rowid:", ins.lastInsertRowid);

// 3. Read it back
const sel = await db.execute(
  "SELECT id,ts,kind,state,n,r_score,detail FROM reactor_events ORDER BY id DESC LIMIT 3",
);
console.log("✓ latest rows:");
for (const r of sel.rows) {
  console.log(
    `  id=${r.id} kind=${r.kind} state=${r.state} r_score=${r.r_score} detail=${r.detail}`,
  );
}

// 4. Cleanup
await db.execute({
  sql: "DELETE FROM reactor_events WHERE detail='kiro-verify'",
  args: [],
});
console.log("✓ cleanup done");
console.log("\nAll checks passed — DB is connected and working.");
