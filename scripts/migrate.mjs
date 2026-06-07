import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.TURSO_URL;
const authToken = process.env.TURSO_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_URL or TURSO_TOKEN environment variables.");
  process.exit(1);
}

const db = createClient({ url, authToken });

const sql = readFileSync(
  join(__dirname, "../migrations/001_create_reactor_events.sql"),
  "utf8",
);

// Split on semicolons, filter blanks, run each statement
const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

for (const stmt of statements) {
  console.log(`Executing:\n  ${stmt.split("\n")[0]}…`);
  await db.execute(stmt);
}

console.log("Migration complete.");
