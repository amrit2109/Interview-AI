/**
 * Neon PostgreSQL client for serverless/edge.
 * Uses @neondatabase/serverless driver.
 */

import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("DATABASE_URL is not set. Database operations will fail.");
}

export const sql = connectionString ? neon(connectionString) : null;
