#!/usr/bin/env node
/**
 * Yellow Sand — DB Setup Script
 * Applies schema + seed to the Supabase Postgres database.
 *
 * Usage:
 *   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.asgrldifzhvsngmaykyc.supabase.co:5432/postgres" \
 *   node scripts/setup-db.mjs
 *
 * Get password: Supabase Dashboard → Project Settings → Database → Database password
 */

import { readFileSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌  DATABASE_URL not set.");
  console.error("    Export it before running:");
  console.error('    DATABASE_URL="postgresql://postgres:PASSWORD@db.asgrldifzhvsngmaykyc.supabase.co:5432/postgres" node scripts/setup-db.mjs');
  process.exit(1);
}

const { Client } = require("pg");
const sql = readFileSync(join(__dirname, "schema-and-seed.sql"), "utf8");

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

console.log("🔌  Connecting to database…");
await client.connect();
console.log("✅  Connected.");

console.log("🏗️   Applying schema + seed…");
try {
  await client.query(sql);
  console.log("✅  Done! Schema created and 12 demo vehicles seeded.");
} catch (err) {
  console.error("❌  SQL error:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
