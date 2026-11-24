const express = require('express');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath);
}

if (!process.env.DATABASE_URL) {
  console.error('[Hata] DATABASE_URL ortam değişkeni bulunamadı. Lütfen .env dosyasını kontrol edin.');
  process.exit(1);
}

const PORT = parseInt(process.env.PORT || '8782', 10);
const DATABASE_URL = process.env.DATABASE_URL;
const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'derin_session';

// Plan Definitions (Server-authoritative)
const PLANS = {
  calc: {
    id: 'calc',
    name: 'Hesaplama',
    price: 2500,
    period: '1 yıl',
    pdfCredits: 0
  },
  full: {
    id: 'full',
    name: 'Hesaplama + Yorum Raporu',
    price: 6000,
    period: '1 yıl',
    pdfCredits: 100
  }
};

// Bank Transfer Information
const HAVALE_INFO = {
  receiver: 'Şule mert',
  bank: 'Vakıfbank',
  iban: 'TR680001500158007366472240'
};

// Shopier Configuration
const DEFAULT_SHOPIER_URL = 'https://shop.shopier.com/astrosusu';
const SHOPIER_URLS = {
  calc: process.env.SHOPIER_URL_CALC || null,
  full: process.env.SHOPIER_URL_FULL || null
};

// PostgreSQL Pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('[DB Pool Hatası]', err.message);
});

// Auto-run schema on start
async function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    try {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(sql);
      console.log('[DB] Veritabanı şeması doğrulandı.');
    } catch (err) {
      console.warn('[DB] Şema yükleme uyarısı:', err.message);
    }
  }
}
if (process.env.SKIP_SCHEMA_INIT !== 'true') initDb();

// --- Crypto & Password Helpers ---
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({ hash: derivedKey.toString('hex'), salt });
    });
  });
}

function verifyPassword(password, hash, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      const keyBuffer = derivedKey;
      const hashBuffer = Buffer.from(hash, 'hex');
      if (keyBuffer.length !== hashBuffer.length) return resolve(false);
      try {
        resolve(crypto.timingSafeEqual(keyBuffer, hashBuffer));
      } catch (e) {
        resolve(false);
      }
    });
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// --- In-Memory Rate Limiter for Login Attempts ---
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 mins
const MAX_FAILED_ATTEMPTS = 5;

function checkLoginRateLimit(ip, email) {
  const key = `${ip}:${email.toLowerCase()}`;
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) return true;
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(key);
    return true;
  }
  return entry.count < MAX_FAILED_ATTEMPTS;
}

function recordLoginFailure(ip, email) {
  const key = `${ip}:${email.toLowerCase()}`;
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS)) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
  }
}

function clearLoginFailures(ip, email) {
  loginAttempts.delete(`${ip}:${email.toLowerCase()}`);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

// --- Active Subscription Helper ---
async function getActiveSubscription(userId) {
  try {
    const res = await pool.query(
      `SELECT id, plan_id, plan_name, pdf_credits, starts_at, expires_at, status
       FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
         AND starts_at <= CURRENT_TIMESTAMP
         AND expires_at > CURRENT_TIMESTAMP
       ORDER BY expires_at DESC
       LIMIT 1`,
      [userId]
    );
    return res.rows[0] || null;
  } catch (err) {
    console.error('[Subscription Helper Error]', err.message);
    return null;
  }
}

// --- Module Definitions for Analysis Validation ---
const MODULE_DEFINITIONS = {
  holistic: {
    name: 'Bütünsel Numerolojik Analiz',
    fields: [{ k: 'name', type: 'text' }, { k: 'd', type: 'number' }, { k: 'm', type: 'number' }, { k: 'y', type: 'number' }]
  },
  fullname: {
    name: 'İsim Analizi',
    fields: [{ k: 'name', type: 'text' }]
  },
  birthday: {
    name: 'Doğum Tarihi Analizi',
    fields: [{ k: 'd', type: 'number' }, { k: 'm', type: 'number' }, { k: 'y', type: 'number' }]
  },
  compare: {
    name: 'Karşılaştırma Analizi',
    fields: [
      { k: 'n1', type: 'text' }, { k: 'd1', type: 'number' }, { k: 'm1', type: 'number' }, { k: 'y1', type: 'number' },
      { k: 'n2', type: 'text' }, { k: 'd2', type: 'number' }, { k: 'm2', type: 'number' }, { k: 'y2', type: 'number' }
    ]
  },
  comparenm: {
    name: 'İsim Karşılaştırma',
    fields: [{ k: 'n1', type: 'text' }, { k: 'n2', type: 'text' }]
  },
  location: {
    name: 'Adres / Lokasyon Analizi',
    fields: [{ k: 'ulke', type: 'text' }, { k: 'eyalet', type: 'text' }, { k: 'sehir', type: 'text' }, { k: 'ilce', type: 'text' }, { k: 'semt', type: 'text' }]
  },
  identity: {
    name: 'Kimlik Numarası Analizi',
    fields: [{ k: 'no', type: 'text' }]
  },
  phone: {
    name: 'Telefon Numarası Analizi',
    fields: [{ k: 'no', type: 'text' }]
  },
  carplate: {
    name: 'Araba Plaka Analizi',
    fields: [{ k: 'no', type: 'text' }]
  },
  motoplate: {
    name: 'Motosiklet Plaka Analizi',
    fields: [{ k: 'no', type: 'text' }]
  },
  pdate: {
    name: 'Kişisel Tarih',
    fields: [
      { k: 'd', type: 'number' }, { k: 'm', type: 'number' }, { k: 'y', type: 'number' },
      { k: 'cd', type: 'number' }, { k: 'cm', type: 'number' }, { k: 'cy', type: 'number' }
    ]
  },
  pweek: {
    name: 'Kişisel Hafta',
    fields: [
      { k: 'd', type: 'number' }, { k: 'm', type: 'number' }, { k: 'y', type: 'number' },
      { k: 'cd', type: 'number' }, { k: 'cm', type: 'number' }, { k: 'cy', type: 'number' }
    ]
  },
  pfib: {
    name: 'Kişisel Fibonacci',
    fields: [{ k: 'd', type: 'number' }, { k: 'm', type: 'number' }, { k: 'y', type: 'number' }]
  },
  pcycles: {
    name: 'Kişisel Döngüler',
    fields: [{ k: 'd', type: 'number' }, { k: 'm', type: 'number' }, { k: 'y', type: 'number' }]
  },
  pfateful: {
    name: 'Kadersel Döngüler',
    fields: [{ k: 'd', type: 'number' }, { k: 'm', type: 'number' }, { k: 'y', type: 'number' }]
  },
  ptrans: {
    name: 'Dönüşüm Yılları',
    fields: [{ k: 'd', type: 'number' }, { k: 'm', type: 'number' }, { k: 'y', type: 'number' }, { k: 'cy', type: 'number' }]
  },
  udate: {
    name: 'Evrensel Tarih',
    fields: [{ k: 'd', type: 'number' }, { k: 'm', type: 'number' }, { k: 'y', type: 'number' }]
  },
  uweek: {
    name: 'Evrensel Hafta',
    fields: [{ k: 'd', type: 'number' }, { k: 'm', type: 'number' }, { k: 'y', type: 'number' }]
  },
  ufib: {
    name: 'Evrensel Fibonacci',
    fields: [{ k: 'y', type: 'number' }]
  },
  ucycles: {
    name: 'Evrensel Döngüler',
    fields: [{ k: 'y', type: 'number' }, { k: 'n', type: 'number' }]
  },
  uwheel: {
    name: 'Evrensel Çark',
    fields: [{ k: 'y', type: 'number' }]
  },
  karmic: {
    name: 'Karma Analizi (Ladini)',
    fields: [{ k: 'name', type: 'text' }, { k: 'd', type: 'number' }, { k: 'm', type: 'number' }, { k: 'y', type: 'number' }]
  },
  destiny: {
    name: 'Kader Matrisi',
    fields: [{ k: 'name', type: 'text' }, { k: 'd', type: 'number' }, { k: 'm', type: 'number' }, { k: 'y', type: 'number' }]
  },
  compat: {
    name: 'İsim Uyumluluğu',
    fields: [{ k: 'n1', type: 'text' }, { k: 'n2', type: 'text' }]
  },
  calc: {
    name: 'Hesaplama Aracı',
    fields: [{ k: 'val', type: 'text' }]
  },
  pin: {
    name: 'Pin Kodu Karşılaştırma',
    fields: [{ k: 'p1', type: 'text' }, { k: 'p2', type: 'text' }]
  }
};

// --- Express App Setup ---
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Block direct access to hidden files and forbidden paths
app.use((req, res, next) => {
  const p = req.path;
  if (p.includes('/.') || p.endsWith('.env') || p.includes('.git') || p.endsWith('.sql')) {
    return res.status(404).send('Not Found');
  }
  next();
});

// Session Authenticator Middleware
async function authenticate(req, res, next) {
  const rawToken = req.cookies[COOKIE_NAME];
  if (!rawToken) {
    req.user = null;
    return next();
  }

  try {
    const tokenHash = hashToken(rawToken);
    const query = `
      SELECT s.id AS session_id, s.expires_at, u.id AS user_id, u.email, u.status, u.role
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP
    `;
    const result = await pool.query(query, [tokenHash]);
    if (result.rows.length === 0) {
      res.clearCookie(COOKIE_NAME, { path: '/' });
      req.user = null;
      return next();
    }

    const row = result.rows[0];
    req.user = {
      id: row.user_id,
      email: row.email,
      status: row.status,
      role: row.role || 'user',
      sessionId: row.session_id
    };
    next();
  } catch (err) {
    console.error('[Auth Hatası]', err.message);
    req.user = null;
    next();
  }
}
app.use(authenticate);

const reports = require('./reports').createReports(pool);
reports.mount(app, requireAuthApi);
setInterval(() => reports.expire().catch(err => console.error('[PDF timeout]', err.message)), 30000).unref();

// 1. Page Guard Middleware (Redirects to /hesap if unauthenticated, pending, or expired)
async function requireActivePage(req, res, next) {
  if (!req.user || req.user.status !== 'active') {
    return res.redirect('/hesap');
  }
  const sub = await getActiveSubscription(req.user.id);
  if (!sub) {
    return res.redirect('/hesap?status=expired');
  }
  req.subscription = sub;
  next();
}

// 2. Protected API Middleware (Always returns 401 or 403 JSON regardless of Accept header)
async function requireActiveApi(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
  }
  if (req.user.status !== 'active') {
    return res.status(403).json({
      error: 'Üyeliğiniz onay bekliyor.',
      status: req.user.status
    });
  }
  const sub = await getActiveSubscription(req.user.id);
  if (!sub) {
    return res.status(403).json({
      error: 'Geçerli bir üyelik süreniz bulunmamaktadır. Lütfen üyeliğinizi yenileyin.',
      code: 'SUBSCRIPTION_EXPIRED'
    });
  }
  req.subscription = sub;
  next();
}

function requireAuthApi(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
  }
  next();
}

// 3. Admin Middleware (Guards /admin and /api/admin/*)
function requireAdmin(req, res, next) {
  if (!req.user) {
    if (req.accepts('html')) return res.redirect('/hesap');
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
  }
  if (req.user.role !== 'admin') {
    if (req.accepts('html')) return res.redirect('/hesap');
    return res.status(403).json({ error: 'Yönetici yetkisi gereklidir.' });
  }
  next();
}

// Cookie Helper
function setSessionCookie(res, rawToken) {
  res.cookie(COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// --- Specific Whitelisted Static Assets ---
const ALLOWED_ASSETS = new Set([
  'astro_sushu_engine.js',
  'birth_wheel_svg.js',
  'destiny_matrix_svg.js',
  'karmic_svg.js',
  'numerology_data.js',
  'numerology_definitions.js',
  'analysis_expositor.js',
  'report-ui.js',
  'site-theme.js',
  'site-theme.css',
  'hero-carousel.js',
  'hero-butunsel-analiz.webp',
  'hero-dogum-tarihi.webp',
  'hero-isim-analizi.webp',
  'hero-adres-analizi.webp',
  'hero-para-kodu.webp',
  'numeroloji-calisma-defteri.webp',
  'gizem-sule-mert-avatar.webp',
  'astro-susu-ornek-rapor.pdf',
  'workflow-report-cover.webp',
  'workflow-report-reading.webp'
]);

app.get('/assets/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!ALLOWED_ASSETS.has(filename)) {
    return res.status(404).send('Not Found');
  }
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(filePath);
});

// --- HTML Page Routes ---
// 1. Tanıtım Sayfası (Herkese açık)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'anasayfa.html'));
});

// 2. Hesap / Giriş / Kayıt Ekranı (Herkese açık)
app.get('/hesap', (req, res) => {
  res.sendFile(path.join(__dirname, 'hesap.html'));
});

app.get('/raporlarim', (req, res) => {
  if (!req.user) return res.redirect('/hesap');
  res.sendFile(path.join(__dirname, 'raporlarim.html'));
});

// 3. Üye Analiz Alanı (Aktif ve süresi geçerli üyelik gerektirir)
app.get('/uygulama', requireActivePage, (req, res) => {
  res.sendFile(path.join(__dirname, 'uygulama.html'));
});

// 4. Yönetici Paneli (Yalnızca rol = admin olan kullanıcılar erişebilir)
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- Public Plans & Payment Config API ---
app.get('/api/plans', (req, res) => {
  res.json({
    plans: PLANS,
    havale: HAVALE_INFO,
    shopier: {
      defaultUrl: DEFAULT_SHOPIER_URL,
      customUrls: SHOPIER_URLS
    }
  });
});

// --- Auth APIs ---

// GET /api/auth/me
app.get('/api/auth/me', requireAuthApi, async (req, res) => {
  const sub = await getActiveSubscription(req.user.id);
  const latestOrderRes = await pool.query(
    `SELECT id, order_ref, plan_id, plan_name, amount_tl, payment_method, shopier_order_no, status, created_at, reviewed_at
     FROM payment_orders
     WHERE user_id = $1
     ORDER BY id DESC LIMIT 1`,
    [req.user.id]
  );

  res.json({
    id: req.user.id,
    email: req.user.email,
    status: req.user.status,
    role: req.user.role,
    subscription: sub,
    latestOrder: latestOrderRes.rows[0] || null
  });
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  if (typeof req.body.email !== 'string' || typeof req.body.password !== 'string') {
    return res.status(400).json({ error: 'Geçersiz veri tipi.' });
  }

  const email = req.body.email.trim().toLowerCase();
  const password = req.body.password;

  if (!email || !email.includes('@') || email.length < 5) {
    return res.status(400).json({ error: 'Geçerli bir e-posta adresi giriniz.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Yeni şifreniz en az 8 karakter olmalıdır.' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten var.' });
    }

    const { hash, salt } = await hashPassword(password);
    const insertRes = await pool.query(
      `INSERT INTO users (email, password_hash, password_salt, status, role)
       VALUES ($1, $2, $3, 'pending', 'user')
       RETURNING id, email, status, role`,
      [email, hash, salt]
    );
    const user = insertRes.rows[0];

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    setSessionCookie(res, rawToken);
    res.status(201).json({
      message: 'Kayıt başarılı. Hesabınız beklemede.',
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        role: user.role
      }
    });
  } catch (err) {
    console.error('[Register Hatası]', err.message);
    res.status(500).json({ error: 'Kayıt sırasında sunucu hatası oluştu.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (typeof req.body.email !== 'string' || typeof req.body.password !== 'string') {
    return res.status(400).json({ error: 'Geçersiz veri tipi.' });
  }

  const email = req.body.email.trim().toLowerCase();
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-posta ve şifre gereklidir.' });
  }

  if (!checkLoginRateLimit(ip, email)) {
    return res.status(429).json({
      error: 'Çok fazla hatalı giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.'
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, password_salt, status, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      recordLoginFailure(ip, email);
      return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
    }

    const user = result.rows[0];
    const valid = await verifyPassword(password, user.password_hash, user.password_salt);
    if (!valid) {
      recordLoginFailure(ip, email);
      return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
    }

    clearLoginFailures(ip, email);

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    setSessionCookie(res, rawToken);
    res.json({
      message: 'Giriş başarılı.',
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        role: user.role
      }
    });
  } catch (err) {
    console.error('[Login Hatası]', err.message);
    res.status(500).json({ error: 'Giriş sırasında sunucu hatası oluştu.' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', async (req, res) => {
  const rawToken = req.cookies[COOKIE_NAME];
  if (rawToken) {
    try {
      const tokenHash = hashToken(rawToken);
      await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
    } catch (err) {
      console.error('[Logout Hatası]', err.message);
    }
  }
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ message: 'Çıkış yapıldı.' });
});

// --- Order & Payment APIs (Authenticated Members) ---

// POST /api/orders (Select plan and payment method; idempotent & concurrency-safe)
app.post('/api/orders', requireAuthApi, async (req, res) => {
  const planId = (req.body.planId || '').trim();
  const paymentMethod = (req.body.paymentMethod || '').trim().toLowerCase(); // 'shopier' or 'havale'

  if (!PLANS[planId]) {
    return res.status(400).json({ error: 'Geçersiz plan seçimi.' });
  }
  if (paymentMethod !== 'shopier' && paymentMethod !== 'havale') {
    return res.status(400).json({ error: 'Geçersiz ödeme yöntemi.' });
  }

  const plan = PLANS[planId];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock open order for this user (draft or pending_review)
    const openRes = await client.query(
      `SELECT * FROM payment_orders
       WHERE user_id = $1 AND status IN ('draft', 'pending_review')
       FOR UPDATE`,
      [req.user.id]
    );

    if (openRes.rows.length > 0) {
      const openOrder = openRes.rows[0];

      // If order is already in 'pending_review', it is strictly locked:
      // Plan, amount, method, and Shopier no cannot be changed.
      if (openOrder.status === 'pending_review') {
        await client.query('COMMIT');
        return res.json({
          order: openOrder,
          locked: true,
          message: 'Bildirim yapılmış inceleme bekleyen siparişiniz bulunmaktadır. Plan veya yöntem değiştirilemez.'
        });
      }

      // If order is in 'draft':
      // If plan or method changed, update the draft
      if (openOrder.plan_id !== plan.id || openOrder.payment_method !== paymentMethod) {
        const updRes = await client.query(
          `UPDATE payment_orders
           SET plan_id = $1, plan_name = $2, amount_tl = $3, payment_method = $4,
               shopier_order_no = NULL, notified_at = NULL
           WHERE id = $5
           RETURNING *`,
          [plan.id, plan.name, plan.price, paymentMethod, openOrder.id]
        );
        await client.query('COMMIT');
        return res.json({ order: updRes.rows[0], updated: true });
      }

      // Same plan and method on draft: return existing draft
      await client.query('COMMIT');
      return res.json({ order: openOrder, reused: true });
    }

    // No open order (or previous orders were closed as approved/rejected):
    // Create new order as 'draft'
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    const orderRef = `DN-${datePart}-${randPart}`;

    const insertRes = await client.query(
      `INSERT INTO payment_orders (user_id, order_ref, plan_id, plan_name, amount_tl, payment_method, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       RETURNING *`,
      [req.user.id, orderRef, plan.id, plan.name, plan.price, paymentMethod]
    );

    await client.query('COMMIT');
    res.status(201).json({ order: insertRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      // Concurrency race: partial unique index caught duplicate open order
      try {
        const fallback = await pool.query(
          `SELECT * FROM payment_orders
           WHERE user_id = $1 AND status IN ('draft', 'pending_review')
           ORDER BY id DESC LIMIT 1`,
          [req.user.id]
        );
        if (fallback.rows.length > 0) {
          return res.json({ order: fallback.rows[0], reused: true });
        }
      } catch (fErr) {}
    }
    console.error('[POST /api/orders Hatası]', err.message);
    res.status(500).json({ error: 'Sipariş oluşturulamadı.' });
  } finally {
    client.release();
  }
});

// POST /api/orders/:orderRef/notify (Submit payment notification; transitions draft -> pending_review)
app.post('/api/orders/:orderRef/notify', requireAuthApi, async (req, res) => {
  const orderRef = (req.params.orderRef || '').trim();
  const shopierOrderNo = (req.body.shopierOrderNo != null ? String(req.body.shopierOrderNo).trim() : null);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ordRes = await client.query(
      `SELECT * FROM payment_orders WHERE order_ref = $1 AND user_id = $2 FOR UPDATE`,
      [orderRef, req.user.id]
    );

    if (ordRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sipariş başvurusu bulunamadı.' });
    }

    const ord = ordRes.rows[0];

    // Closed states cannot be notified
    if (ord.status === 'approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Bu sipariş zaten onaylanmıştır. Tekrar bildirim yapılamaz.' });
    }
    if (ord.status === 'rejected') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Bu sipariş reddedilmiştir. Tekrar bildirim yapılamaz.' });
    }

    // Idempotency: if already in 'pending_review'
    if (ord.status === 'pending_review') {
      await client.query('COMMIT');
      return res.json({
        message: 'Ödeme bildiriminiz daha önce alınmıştır. İnceleme bekliyor.',
        order: ord,
        reused: true
      });
    }

    // Must be in 'draft' to transition to 'pending_review'
    if (ord.status !== 'draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Sipariş durumu bildirim için uygun değil.' });
    }

    // Method-specific checks:
    let finalShopierNo = null;
    if (ord.payment_method === 'shopier') {
      if (!shopierOrderNo || shopierOrderNo.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Lütfen geçerli bir Shopier sipariş numarası giriniz.' });
      }
      finalShopierNo = shopierOrderNo;
    } else if (ord.payment_method === 'havale') {
      if (shopierOrderNo) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Banka havalesi için Shopier sipariş numarası girilemez.' });
      }
      finalShopierNo = null;
    }

    const updRes = await client.query(
      `UPDATE payment_orders
       SET status = 'pending_review',
           shopier_order_no = $1,
           notified_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [finalShopierNo, ord.id]
    );

    await client.query('COMMIT');
    res.json({
      message: 'Ödeme bildiriminiz alındı. İnceleme bekliyor.',
      order: updRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[POST /api/orders/:orderRef/notify Hatası]', err.message);
    res.status(500).json({ error: 'Bildirim kaydedilemedi.' });
  } finally {
    client.release();
  }
});

// GET /api/orders/my (View own orders)
app.get('/api/orders/my', requireAuthApi, async (req, res) => {
  try {
    const resOrders = await pool.query(
      `SELECT * FROM payment_orders WHERE user_id = $1 ORDER BY id DESC LIMIT 10`,
      [req.user.id]
    );
    res.json(resOrders.rows);
  } catch (err) {
    console.error('[GET /api/orders/my Hatası]', err.message);
    res.status(500).json({ error: 'Siparişler alınamadı.' });
  }
});

// --- Administrator APIs ---

// GET /api/admin/orders
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.order_ref, o.plan_id, o.plan_name, o.amount_tl,
             o.payment_method, o.shopier_order_no, o.status, o.notified_at,
             o.created_at, o.reviewed_at, u.email AS user_email
      FROM payment_orders o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/admin/orders Hatası]', err.message);
    res.status(500).json({ error: 'Sipariş listesi alınamadı.' });
  }
});

// POST /api/admin/orders/:id/approve (Single database transaction, serialized per user)
app.post('/api/admin/orders/:id/approve', requireAdmin, async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (!orderId || isNaN(orderId)) {
    return res.status(400).json({ error: 'Geçersiz sipariş kimliği.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock order row
    const orderRes = await client.query(
      'SELECT * FROM payment_orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }
    const order = orderRes.rows[0];

    // Status checks: only pending_review is approvable
    if (order.status === 'draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Taslak durumundaki sipariş onaylanamaz. Önce ödeme bildirimi yapılmalıdır.',
        code: 'ORDER_IS_DRAFT'
      });
    }
    if (order.status === 'approved') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Bu sipariş daha önce onaylanmış.',
        code: 'ORDER_ALREADY_APPROVED'
      });
    }
    if (order.status === 'rejected') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Reddedilmiş sipariş onaylanamaz.',
        code: 'ORDER_REJECTED'
      });
    }
    if (order.status !== 'pending_review') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Sadece inceleme bekleyen siparişler onaylanabilir.',
        code: 'INVALID_STATUS'
      });
    }

    // 2. Lock the user row to serialize approvals for the same user
    await client.query(
      'SELECT id FROM users WHERE id = $1 FOR UPDATE',
      [order.user_id]
    );

    // 3. Ensure this order hasn't already created a subscription
    const existingSubRes = await client.query(
      'SELECT id FROM subscriptions WHERE order_id = $1',
      [order.id]
    );
    if (existingSubRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Bu sipariş için zaten bir üyelik dönemi oluşturulmuş.',
        code: 'ORDER_ALREADY_HAS_SUBSCRIPTION'
      });
    }

    // 4. Shopier duplicate check across approved orders
    if (order.payment_method === 'shopier' && order.shopier_order_no && order.shopier_order_no.trim()) {
      const dupShopier = await client.query(
        `SELECT id FROM payment_orders
         WHERE shopier_order_no = $1 AND status = 'approved' AND id != $2`,
        [order.shopier_order_no.trim(), order.id]
      );
      if (dupShopier.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Bu Shopier sipariş numarasıyla daha önce onaylanmış başka bir üyelik bulunmaktadır.',
          code: 'DUPLICATE_SHOPIER_ORDER'
        });
      }
    }

    // 5. Check active or future subscription for this user:
    // If active/future period exists: allow only renewal of the SAME plan.
    // Different plan cannot open a parallel subscription.
    const activeSubRes = await client.query(
      `SELECT id, plan_id, starts_at, expires_at FROM subscriptions
       WHERE user_id = $1 AND status = 'active' AND expires_at > CURRENT_TIMESTAMP
       ORDER BY expires_at DESC LIMIT 1`,
      [order.user_id]
    );

    let startsAt, expiresAt;
    if (activeSubRes.rows.length > 0) {
      const activeSub = activeSubRes.rows[0];
      if (activeSub.plan_id !== order.plan_id) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Kullanıcının geçerli veya ileri tarihli üyeliği farklı bir plandadır (${activeSub.plan_id}). Paralel farklı plan açılamaz.`,
          code: 'PLAN_CONFLICT'
        });
      }
      // Same plan renewal: extend from latest expiration date by 1 year
      const currentExpires = new Date(activeSub.expires_at);
      startsAt = currentExpires;
      const nextYear = new Date(currentExpires);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      expiresAt = nextYear;
    } else {
      // New subscription: starts now and ends 1 calendar year later
      startsAt = new Date();
      const nextYear = new Date(startsAt);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      expiresAt = nextYear;
    }

    // 6. Update order status to approved
    const updOrder = await client.query(
      `UPDATE payment_orders
       SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $1
       WHERE id = $2
       RETURNING *`,
      [req.user.id, order.id]
    );

    // 7. Ensure user status is active
    await client.query(
      `UPDATE users SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [order.user_id]
    );

    // 8. Insert subscription period
    const pdfCredits = (order.plan_id === 'full') ? 100 : 0;
    const subRes = await client.query(
      `INSERT INTO subscriptions (user_id, order_id, plan_id, plan_name, pdf_credits, starts_at, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING *`,
      [order.user_id, order.id, order.plan_id, order.plan_name, pdfCredits, startsAt, expiresAt]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Sipariş onaylandı ve üyelik dönemi aktifleşti.',
      order: updOrder.rows[0],
      subscription: subRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Veritabanı kısıt çakışması: Bu sipariş veya ödeme numarası zaten onaylanmış.',
        code: 'CONFLICT'
      });
    }
    console.error('[Approve Error]', err.message);
    res.status(500).json({ error: 'Onay işlemi sırasında sunucu hatası oluştu.' });
  } finally {
    client.release();
  }
});

// POST /api/admin/orders/:id/reject
app.post('/api/admin/orders/:id/reject', requireAdmin, async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (!orderId || isNaN(orderId)) {
    return res.status(400).json({ error: 'Geçersiz sipariş kimliği.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      'SELECT * FROM payment_orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }

    const order = orderRes.rows[0];

    if (order.status === 'draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Taslak durumundaki sipariş reddedilemez. Sadece bildirim yapılmış siparişler reddedilebilir.',
        code: 'ORDER_IS_DRAFT'
      });
    }

    if (order.status === 'approved') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Onaylanmış sipariş reddedilemez.',
        code: 'ORDER_ALREADY_APPROVED'
      });
    }

    if (order.status === 'rejected') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Bu sipariş daha önce reddedilmiş.',
        code: 'ORDER_ALREADY_REJECTED'
      });
    }

    const updRes = await client.query(
      `UPDATE payment_orders
       SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $1
       WHERE id = $2
       RETURNING *`,
      [req.user.id, orderId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Sipariş reddedildi.', order: updRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[Reject Error]', err.message);
    res.status(500).json({ error: 'Red işlemi sırasında sunucu hatası oluştu.' });
  } finally {
    client.release();
  }
});

// --- Saved People APIs (Active Subscribed Members Only) ---

// GET /api/people (Active users can list people)
app.get('/api/people', requireAuthApi, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, birth_day AS d, birth_month AS m, birth_year AS y,
              birth_time AS time, birth_place AS place, created_at AS "createdAt"
       FROM saved_people
       WHERE user_id = $1
       ORDER BY id DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/people Hatası]', err.message);
    res.status(500).json({ error: 'Kayıtlı kişiler alınamadı.' });
  }
});

// POST /api/people (Adding person requires active subscription)
app.post('/api/people', requireActiveApi, async (req, res) => {
  const name = (typeof req.body.name === 'string') ? req.body.name.trim() : '';
  const d = String(req.body.d || '').trim();
  const m = String(req.body.m || '').trim();
  const y = String(req.body.y || '').trim();
  const time = String(req.body.time || '').trim();
  const place = String(req.body.place || '').trim();

  if (!name || !d || !m || !y) {
    return res.status(400).json({ error: 'Kişi ismi ve doğum tarihi (gün/ay/yıl) zorunludur.' });
  }

  const dNum = parseInt(d, 10);
  const mNum = parseInt(m, 10);
  const yNum = parseInt(y, 10);
  if (isNaN(dNum) || dNum < 1 || dNum > 31) {
    return res.status(400).json({ error: 'Geçersiz doğum günü (1-31).' });
  }
  if (isNaN(mNum) || mNum < 1 || mNum > 12) {
    return res.status(400).json({ error: 'Geçersiz doğum ayı (1-12).' });
  }
  if (isNaN(yNum) || yNum < 1000 || yNum > 3000) {
    return res.status(400).json({ error: 'Geçersiz doğum yılı.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO saved_people (user_id, name, birth_day, birth_month, birth_year, birth_time, birth_place)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, birth_day AS d, birth_month AS m, birth_year AS y,
                 birth_time AS time, birth_place AS place, created_at AS "createdAt"`,
      [req.user.id, name, d, m, y, time, place]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[POST /api/people Hatası]', err.message);
    res.status(500).json({ error: 'Kişi kaydedilemedi.' });
  }
});

// DELETE /api/people/:id
app.delete('/api/people/:id', requireAuthApi, async (req, res) => {
  const personId = parseInt(req.params.id, 10);
  if (!personId || isNaN(personId)) {
    return res.status(400).json({ error: 'Geçersiz kişi kimliği.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM saved_people WHERE id = $1 AND user_id = $2 RETURNING id',
      [personId, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Kayıt bulunamadı veya yetkiniz yok.' });
    }
    res.json({ success: true, id: personId });
  } catch (err) {
    console.error('[DELETE /api/people Hatası]', err.message);
    res.status(500).json({ error: 'Kişi silinemedi.' });
  }
});

// --- Analysis History APIs ---

// GET /api/history (Authenticated users can view past history even if subscription expired)
app.get('/api/history', requireAuthApi, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, module_id AS "moduleId", module_name AS "moduleName",
              input_data AS "inputData", created_at AS "createdAt"
       FROM analysis_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/history Hatası]', err.message);
    res.status(500).json({ error: 'Geçmiş analizler alınamadı.' });
  }
});

// POST /api/history (Running new analysis requires active unexpired subscription)
app.post('/api/history', requireActiveApi, async (req, res) => {
  const moduleId = (typeof req.body.moduleId === 'string') ? req.body.moduleId.trim() : '';
  if (!moduleId || !MODULE_DEFINITIONS[moduleId]) {
    return res.status(400).json({ error: 'Bilinmeyen veya geçersiz modül kimliği.' });
  }

  const moduleDef = MODULE_DEFINITIONS[moduleId];
  const moduleName = moduleDef.name; // Use verified module name from server definition

  const inputData = req.body.inputData;
  if (!inputData || typeof inputData !== 'object' || Array.isArray(inputData)) {
    return res.status(400).json({ error: 'Geçersiz girdi yapısı.' });
  }

  // Reject nested object or array in inputData
  for (const key of Object.keys(inputData)) {
    const v = inputData[key];
    if (v !== null && typeof v === 'object') {
      return res.status(400).json({ error: 'Form girdisi olarak dizi veya iç içe nesne kabul edilmez.' });
    }
  }

  // Validate module required fields
  const cleanInputs = {};
  for (const field of moduleDef.fields) {
    const val = inputData[field.k];
    if (val === undefined || val === null || String(val).trim() === '') {
      return res.status(400).json({ error: `Eksik alan: ${field.k}` });
    }
    const strVal = String(val).trim();
    if (field.type === 'number') {
      const num = parseInt(strVal, 10);
      if (isNaN(num)) {
        return res.status(400).json({ error: `Geçersiz sayısal değer: ${field.k}` });
      }
      if (field.k === 'd' || field.k === 'd1' || field.k === 'd2' || field.k === 'cd') {
        if (num < 1 || num > 31) return res.status(400).json({ error: `Geçersiz gün (1-31): ${field.k}` });
      }
      if (field.k === 'm' || field.k === 'm1' || field.k === 'm2' || field.k === 'cm') {
        if (num < 1 || num > 12) return res.status(400).json({ error: `Geçersiz ay (1-12): ${field.k}` });
      }
      if (field.k === 'y' || field.k === 'y1' || field.k === 'y2' || field.k === 'cy') {
        if (num < 1000 || num > 3000) return res.status(400).json({ error: `Geçersiz yıl: ${field.k}` });
      }
      if (field.k === 'n') {
        if (num < 1 || num > 100) return res.status(400).json({ error: `Geçersiz süre: ${field.k}` });
      }
      cleanInputs[field.k] = strVal;
    } else {
      cleanInputs[field.k] = strVal;
    }
  }

  // Preserve any optional scalar fields (e.g. time, place) without making them mandatory
  for (const key of Object.keys(inputData)) {
    if (cleanInputs[key] === undefined && (typeof inputData[key] === 'string' || typeof inputData[key] === 'number')) {
      cleanInputs[key] = String(inputData[key]).trim();
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO analysis_history (user_id, module_id, module_name, input_data)
       VALUES ($1, $2, $3, $4)
       RETURNING id, module_id AS "moduleId", module_name AS "moduleName",
                 input_data AS "inputData", created_at AS "createdAt"`,
      [req.user.id, moduleId, moduleName, JSON.stringify(cleanInputs)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[POST /api/history Hatası]', err.message);
    res.status(500).json({ error: 'Analiz kaydedilemedi.' });
  }
});

// DELETE /api/history/:id
app.delete('/api/history/:id', requireAuthApi, async (req, res) => {
  const historyId = parseInt(req.params.id, 10);
  if (!historyId || isNaN(historyId)) {
    return res.status(400).json({ error: 'Geçersiz geçmiş kimliği.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM analysis_history WHERE id = $1 AND user_id = $2 RETURNING id',
      [historyId, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Kayıt bulunamadı veya yetkiniz yok.' });
    }
    res.json({ success: true, id: historyId });
  } catch (err) {
    console.error('[DELETE /api/history/:id Hatası]', err.message);
    res.status(500).json({ error: 'Geçmiş silinemedi.' });
  }
});

// DELETE /api/history
app.delete('/api/history', requireAuthApi, async (req, res) => {
  try {
    await pool.query('DELETE FROM analysis_history WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/history Hatası]', err.message);
    res.status(500).json({ error: 'Geçmiş temizlenemedi.' });
  }
});

// Start Server
if (process.env.VERCEL !== '1') app.listen(PORT, '127.0.0.1', () => {
  console.log(`[Derin Numeroloji] Sunucu 127.0.0.1:${PORT} üzerinde çalışıyor.`);
});
module.exports = app;
