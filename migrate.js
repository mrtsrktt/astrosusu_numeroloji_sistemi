#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
if (fs.existsSync(path.join(__dirname, '.env')) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(path.join(__dirname, '.env'));
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ortam değişkeni gerekli.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Additive only: never rewrite users, payment states, analyses or credit rights.
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'user'");
    await client.query('ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ');
    await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    await client.query('COMMIT');
    console.log('[Migration] Şema ve PDF arşivi güncellendi; mevcut kayıtlar değiştirilmedi.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[Migration]', e.message); process.exitCode = 1;
  } finally { client.release(); await pool.end(); }
}
migrate();
