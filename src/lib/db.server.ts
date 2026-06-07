import { createClient } from "@libsql/client";

function createTursoClient() {
  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_TOKEN;

  if (!url || !authToken) {
    const missing = [...(!url ? ["TURSO_URL"] : []), ...(!authToken ? ["TURSO_TOKEN"] : [])];
    throw new Error(`Missing Turso environment variable(s): ${missing.join(", ")}`);
  }

  return createClient({ url, authToken });
}

let _db: ReturnType<typeof createTursoClient> | undefined;

export function getDb() {
  if (!_db) _db = createTursoClient();
  return _db;
}
