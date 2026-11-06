// Provisional db client; D owns the final version.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { db?: Db };

function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // prepare: false keeps it compatible with the Supabase transaction pooler.
  return drizzle(postgres(url, { prepare: false }), { schema });
}

export function getDb(): Db {
  globalForDb.db ??= createDb();
  return globalForDb.db;
}

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
