/**
 * Neon PostgreSQL client for serverless/edge.
 * Uses @neondatabase/serverless driver.
 */

import { neon } from "@neondatabase/serverless";
import { getEnv } from "@/lib/env";

const env = getEnv();
const connectionString = env.DATABASE_URL;
if (!connectionString && env.NODE_ENV !== "test") {
  throw new Error("DATABASE_URL must be set. Database operations will fail.");
}

export const sql = connectionString ? neon(connectionString) : null;
