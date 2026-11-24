#!/usr/bin/env node
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath);
}

if (!process.env.DATABASE_URL) {
  console.error('[Hata] DATABASE_URL ortam değişkeni bulunamadı. Lütfen .env dosyasını kontrol edin.');
  process.exit(1);
}

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Kullanım: node make_admin.js <eposta>');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await client.connect();
    const res = await client.query(
      `UPDATE users SET role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE email = $1 RETURNING id, email, role, status`,
      [email]
    );
    if (res.rowCount === 0) {
      console.error(`Kullanıcı bulunamadı: ${email}`);
      process.exit(1);
    }
    console.log(`Kullanıcıya başarıyla yönetici yetkisi verildi: ${res.rows[0].email} (Rol: ${res.rows[0].role})`);
  } catch (err) {
    console.error('Veritabanı işlemi başarısız oldu.');
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

run();
