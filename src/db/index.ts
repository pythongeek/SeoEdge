import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy database initialization
let cachedDb: ReturnType<typeof createDb> | null = null;

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

export function getDb() {
  if (!cachedDb) {
    cachedDb = createDb();
  }
  return cachedDb;
}

// Direct export - will error at runtime if DATABASE_URL not set
// API routes must check for db availability
export const db = (() => {
  try {
    return getDb();
  } catch {
    // Return a minimal stub for build time
    return {} as ReturnType<typeof createDb>;
  }
})();

export type DbClient = ReturnType<typeof createDb>;
