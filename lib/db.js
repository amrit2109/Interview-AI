/**
 * Neon PostgreSQL client for serverless/edge.
 * Uses @neondatabase/serverless driver.
 * Lazy initialization to avoid env validation at module load.
 */

import { neon } from "@neondatabase/serverless";
import { getEnv } from "@/lib/env";

let sqlInstance = null;

function getSql() {
  if (sqlInstance === null) {
    const env = getEnv();
    const connectionString = env.DATABASE_URL;
    if (!connectionString && env.NODE_ENV !== "test") {
      throw new Error("DATABASE_URL must be set. Database operations will fail.");
    }
    sqlInstance = connectionString ? neon(connectionString) : null;
  }
  return sqlInstance;
}

export { getSql };
