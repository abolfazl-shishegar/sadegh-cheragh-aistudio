import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PRODUCTS, CAR_MODELS, CAR_BRANDS } from './src/data/carsAndProducts.ts';
import {
  cleanText,
  isExpressAvailable,
  isSideAllowedForCategory,
  normalizeDigits,
  ORDER_SIDE_LABELS,
  unitPriceForSide,
  unitsForItem,
  validateCheckoutStep1,
  type OrderSide,
} from './src/utils/shopLogic.ts';

type ProductRow = { id: string; payload: string; active: number; version: number };
type OrderRow = { id: string; phone: string; payload: string };
type SettingsRow = { standard: number; express: number; free: number; open: number };
type AdminAuthRow = { password_hash: string };

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const app = express();
const dbPath = process.env.SADEGH_DB || fileURLToPath(new URL('./sadegh-cheragh.sqlite', import.meta.url));
const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY, payload TEXT NOT NULL, active INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, phone TEXT NOT NULL, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY, standard INTEGER NOT NULL, express INTEGER NOT NULL, free INTEGER NOT NULL, open INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS admin_auth(id INTEGER PRIMARY KEY CHECK (id = 1), password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
`);
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS order_tracking ON orders(json_extract(payload, '$.trackingCode'))");

function atomic<T>(action: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = action();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

atomic(() => {
  if (db.prepare('SELECT id FROM settings WHERE id=1').get()) return;
  const insert = db.prepare('INSERT INTO products(id,payload,active) VALUES (?,?,1)');
  for (const p of PRODUCTS) {
    insert.run(p.id, JSON.stringify(p));
  }
  db.prepare('INSERT INTO settings VALUES(1,55000,85000,2000000,1)').run();
});

function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}

function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    fail(400, 'عدد واردشده معتبر نیست.');
  }
  return value;
}

const getSettings = () => db.prepare('SELECT standard, express, free, open FROM settings WHERE id=1').get() as SettingsRow;
const publicProduct = (row: ProductRow) => JSON.parse(row.payload);
const adminProduct = (row: ProductRow) => ({ ...publicProduct(row), active: !!row.active, version: row.version });
const listProducts = (all = false) =>
  db.prepare('SELECT * FROM products WHERE active=1 OR ?=1 ORDER BY rowid').all(Number(all)) as ProductRow[];
const findProduct = (id: string) => db.prepare('SELECT * FROM products WHERE id=?').get(id) as ProductRow | undefined;
const getOrder = (id: string) => db.prepare('SELECT * FROM orders WHERE id=?').get(id) as OrderRow | undefined;
const writeOrder = db.prepare('UPDATE orders SET payload=? WHERE id=?');
const writeProduct = db.prepare('UPDATE products SET payload=?,active=?,version=version+1 WHERE id=?');
const getAdminAuth = () => db.prepare('SELECT password_hash FROM admin_auth WHERE id=1').get() as AdminAuthRow | undefined;

const nextStatus: Record<string, string[]> = {
  processing: ['packing', 'cancelled'],
  packing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const categories: Record<string, string> = {
  headlight: 'جلو',
  taillight: 'عقب',
  foglight: 'پروژکتور',
  accessory: 'متفرقه',
  bundle: 'متفرقه',
};

// --- Admin Authentication (scrypt + server-side Bearer sessions) ---
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const sessions = new Map<string, number>();

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyStoredPassword(password: string, stored: string): boolean {
  const [salt, derivedHex] = stored.split(':');
  if (!salt || !derivedHex) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(derivedHex, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function verifyEnvPassword(password: string, envPassword: string): boolean {
  const a = createHash('sha256').update(password).digest();
  const b = createHash('sha256').update(envPassword).digest();
  return timingSafeEqual(a, b);
}

function getConfiguredEnvPassword(): string {
  return (process.env.ADMIN_PASSWORD ?? '').trim();
}

function createAdminSession(): string {
  const now = Date.now();
  for (const [key, exp] of sessions.entries()) {
    if (exp <= now) sessions.delete(key);
  }
  const token = randomBytes(32).toString('hex');
  sessions.set(sha256Hex(token), now + SESSION_TTL_MS);
  return token;
}

function extractBearerToken(req: Request): string {
  const authHeader = req.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7).trim();
}

function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    fail(401, 'برای دسترسی به پنل مدیریت ابتدا وارد شوید.');
  }
  const hashed = sha256Hex(token);
  const expiresAt = sessions.get(hashed);
  if (!expiresAt || expiresAt <= Date.now()) {
    sessions.delete(hashed);
    fail(401, 'نشست مدیریت منقضی یا نامعتبر است. لطفاً دوباره وارد شوید.');
  }
  next();
}

// --- In-memory sliding-window Rate Limiter ---
function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  const hits = new Map<string, number[]>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const recent = (hits.get(key) ?? []).filter((ts) => ts > now - options.windowMs);
    if (recent.length >= options.max) {
      res.status(429).json({ error: options.message });
      return;
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}

const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.SADEGH_AUTH_RATE_MAX || 15),
  message: 'تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً چند دقیقه دیگر دوباره تلاش کنید.',
});

const orderRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.SADEGH_ORDER_RATE_MAX || 20),
  message: 'تعداد درخواست‌های ثبت سفارش بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.',
});

const trackRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.SADEGH_TRACK_RATE_MAX || 30),
  message: 'تعداد درخواست‌های پیگیری بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.',
});

// --- Security headers & flexible same-origin protection (supports HTTP & HTTPS / custom domains) ---
const extraAllowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);

function isOriginAllowed(origin: string, requestHost: string): boolean {
  if (extraAllowedOrigins.has(origin)) return true;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return parsed.host.toLowerCase() === requestHost.toLowerCase();
  } catch {
    return false;
  }
}

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
      const requestHost = forwardedHost || req.get('host') || '';
      const origin = req.get('origin');
      if (!requestHost || (origin && !isOriginAllowed(origin, requestHost)) || !req.is('application/json')) {
        res.status(403).json({ error: 'مبدأ یا قالب درخواست مجاز نیست.' });
        return;
      }
    }
  }
  next();
});

app.use(express.json({ limit: '24kb' }));

// --- Public Storefront API ---
app.get('/api/catalog', (_req, res) => {
  res.json({ products: listProducts().map(publicProduct), settings: getSettings() });
});

app.post('/api/orders', orderRateLimit, (req, res) => {
  const data = req.body ?? {};
  const requestId = cleanText(data.requestId, 32);
  if (!/^[a-f0-9]{32}$/.test(requestId)) {
    fail(400, 'شناسه درخواست سفارش معتبر نیست.');
  }

  const validation = validateCheckoutStep1({
    customerName: data.customerName,
    phone: data.phone,
    province: data.province,
    city: data.city,
    address: data.address,
    postalCode: data.postalCode ?? '',
  });
  if (!validation.valid) {
    const firstError = Object.values(validation.errors)[0] || 'اطلاعات تحویل‌گیرنده و آدرس را بررسی کنید.';
    fail(400, firstError);
  }
  const { customerName, phone, province, city, address, postalCode } = validation.normalized;

  const shippingMethod = data.shippingMethod;
  if (!['tipax', 'pishtaz', 'express'].includes(shippingMethod) || (shippingMethod === 'express' && !isExpressAvailable(city))) {
    fail(400, 'روش ارسال برای این مقصد در دسترس نیست.');
  }

  const order = atomic(() => {
    const existing = getOrder(requestId);
    if (existing) {
      if (existing.phone !== phone) fail(409, 'شناسه درخواست تکراری است.');
      return JSON.parse(existing.payload);
    }

    const config = getSettings();
    if (!config.open) fail(409, 'ثبت سفارش موقتاً بسته است.');
    if (!Array.isArray(data.items) || !data.items.length || data.items.length > 50) {
      fail(400, 'سبد خرید معتبر نیست.');
    }

    const stock = new Map<string, { product: Record<string, any>; used: number }>();
    const seen = new Set<string>();

    const items = data.items.map((line: Record<string, unknown>) => {
      const row = findProduct(cleanText(line?.productId, 70));
      const side = line?.side as OrderSide;
      if (!row?.active || !Object.hasOwn(ORDER_SIDE_LABELS, side)) {
        fail(409, 'کالا یا سمت انتخاب‌شده دیگر در دسترس نیست.');
      }
      const product = publicProduct(row);
      if (!isSideAllowedForCategory(side, product.category)) {
        fail(400, 'نوع سمت انتخاب‌شده برای این کالا معتبر نیست.');
      }

      const quantity = integer(line.quantity, 1, 99);
      const id = `${product.id}-${side}`;
      if (seen.has(id)) fail(400, 'یک ردیف کالا تکراری است.');
      seen.add(id);

      const unitPrice = unitPriceForSide(product, side);
      const lineUnits = unitsForItem(side, quantity, product.category);
      const used = (stock.get(product.id)?.used ?? 0) + lineUnits;
      if (!product.inStock || used > product.stockCount || line.unitPrice !== unitPrice) {
        fail(409, 'قیمت یا موجودی تغییر کرده است. سبد خرید را دوباره بررسی کنید.');
      }
      stock.set(product.id, { product, used });
      return {
        id,
        productId: product.id,
        product,
        selectedSide: side,
        sideLabel: ORDER_SIDE_LABELS[side],
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
      };
    });

    const subtotal = items.reduce((sum: number, line: { totalPrice: number }) => sum + line.totalPrice, 0);
    const shippingCost =
      config.free > 0 && subtotal >= config.free
        ? 0
        : shippingMethod === 'express'
          ? config.express
          : config.standard;
    const totalAmount = subtotal + shippingCost;
    if (totalAmount !== data.totalAmount) {
      fail(409, 'مبلغ سفارش تغییر کرده است. سبد را دوباره بررسی کنید.');
    }

    for (const { product, used } of stock.values()) {
      product.stockCount -= used;
      product.inStock = product.stockCount > 0;
      writeProduct.run(JSON.stringify(product), 1, product.id);
    }

    const createdOrder = {
      id: requestId,
      trackingCode: 'SC-' + randomBytes(10).toString('hex').toUpperCase(),
      customerName,
      phone,
      province,
      city,
      address,
      postalCode,
      shippingMethod,
      shippingCost,
      items,
      subtotal,
      discountAmount: 0,
      totalAmount,
      paymentMethod: 'cod',
      status: 'processing',
      createdAt: new Date().toISOString(),
      carrierCode: '',
    };

    db.prepare('INSERT INTO orders VALUES(?,?,?)').run(createdOrder.id, phone, JSON.stringify(createdOrder));
    return createdOrder;
  });

  res.status(201).json(order);
});

app.post('/api/track', trackRateLimit, (req, res) => {
  const code = cleanText(req.body?.code, 23).toUpperCase();
  const phone = normalizeDigits(req.body?.phone).replace(/[\s-]/g, '');
  const row = db
    .prepare("SELECT payload FROM orders WHERE json_extract(payload,'$.trackingCode')=? AND phone=?")
    .get(code, phone) as { payload: string } | undefined;
  if (!row) fail(404, 'سفارشی با این کد و شماره موبایل پیدا نشد.');
  const { trackingCode, status, createdAt, shippingMethod, carrierCode, totalAmount, items } = JSON.parse(row.payload);
  res.json({
    trackingCode,
    status,
    createdAt,
    shippingMethod,
    carrierCode,
    totalAmount,
    items: items.map(({ product, sideLabel, quantity }: any) => ({
      title: product.titleFa,
      sideLabel,
      quantity,
    })),
  });
});

// --- Admin Authentication API ---
app.get('/api/admin/auth/status', (_req, res) => {
  const configuredViaEnv = getConfiguredEnvPassword().length > 0;
  const claimed = Boolean(getAdminAuth());
  res.json({
    configuredViaEnv,
    needsSetup: !configuredViaEnv && !claimed,
  });
});

app.post('/api/admin/auth/setup', authRateLimit, (req, res) => {
  if (getConfiguredEnvPassword().length > 0) {
    fail(403, 'رمز مدیریت از طریق تنظیمات سرور پیکربندی شده است.');
  }
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (password.length < 8 || password.length > 128) {
    fail(400, 'رمز عبور مدیریت باید حداقل ۸ کاراکتر باشد.');
  }

  atomic(() => {
    if (getAdminAuth()) {
      fail(403, 'رمز عبور مدیریت قبلاً ثبت شده است.');
    }
    const passwordHash = hashPassword(password);
    db.prepare('INSERT INTO admin_auth(id, password_hash, created_at) VALUES (1, ?, ?)').run(
      passwordHash,
      new Date().toISOString(),
    );
  });

  const token = createAdminSession();
  res.status(201).json({ token });
});

app.post('/api/admin/auth/login', authRateLimit, (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password || password.length > 128) {
    fail(401, 'رمز عبور واردشده نادرست است.');
  }

  const envPassword = getConfiguredEnvPassword();
  let ok = false;
  if (envPassword.length > 0) {
    ok = verifyEnvPassword(password, envPassword);
  } else {
    const stored = getAdminAuth();
    if (!stored) {
      fail(409, 'ابتدا رمز عبور مدیریت را در فرم راه‌اندازی اولیه تعیین کنید.');
    }
    ok = verifyStoredPassword(password, stored.password_hash);
  }

  if (!ok) {
    fail(401, 'رمز عبور واردشده نادرست است.');
  }

  const token = createAdminSession();
  res.json({ token });
});

app.post('/api/admin/auth/logout', (req, res) => {
  const token = extractBearerToken(req);
  if (token) {
    sessions.delete(sha256Hex(token));
  }
  res.json({ ok: true });
});

// --- Protected Admin API ---
app.get('/api/admin', requireAdmin, (_req, res) => {
  res.json({
    products: listProducts(true).map(adminProduct),
    settings: getSettings(),
    orders: (db.prepare('SELECT payload FROM orders ORDER BY rowid DESC').all() as { payload: string }[]).map((row) =>
      JSON.parse(row.payload),
    ),
  });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  atomic(() => {
    const data = req.body ?? {};
    const id = cleanText(data.id, 70);
    const row = id ? findProduct(id) : undefined;
    if (id && (!row || row.version !== data.version)) {
      fail(409, 'این کالا تغییر کرده است. اطلاعات را تازه کنید.');
    }

    const titleFa = cleanText(data.titleFa, 120);
    const category = data.category;
    const car = CAR_MODELS.find((model) => model.id === data.modelId);
    const brand = CAR_BRANDS.find((item) => item.id === car?.brandId);
    if (!titleFa || !Object.hasOwn(categories, category) || (!car && data.modelId !== 'all')) {
      fail(400, 'نام، دسته‌بندی و مدل خودرو را بررسی کنید.');
    }

    const priceSingle = integer(data.priceSingle, 1, 1000000000);
    const pricePair = integer(data.pricePair, 1, 1000000000);
    const stockCount = integer(data.stockCount, 0, 1000000);
    const base = row ? publicProduct(row) : {};
    const image = cleanText(data.image, 800) || '/assets/product-placeholder.svg';
    const isSafeLocalAsset = /^\/assets\/[a-zA-Z0-9._/-]+$/.test(image) && !image.includes('..');
    if (!isSafeLocalAsset && !/^https:\/\/[^\s]+$/i.test(image)) {
      fail(400, 'آدرس عکس باید HTTPS یا مسیر معتبر محلی باشد.');
    }

    const description = cleanText(data.description, 1500);
    const compatibilityNotes = cleanText(data.compatibilityNotes, 500);
    const rawGallery: string[] = Array.isArray(data.gallery)
      ? data.gallery
          .map((u: unknown) => cleanText(u, 800))
          .filter((u: string) => u && ((/^\/assets\/[a-zA-Z0-9._/-]+$/.test(u) && !u.includes('..')) || /^https:\/\/[^\s]+$/i.test(u)))
      : [];
    const gallery = rawGallery.length > 0 ? [...new Set([image, ...rawGallery])] : image === base.image && Array.isArray(base.gallery) && base.gallery.length ? base.gallery : [image];

    const incomingSpecs = typeof data.specs === 'object' && data.specs !== null ? data.specs : {};
    const difficultyOptions = new Set(['ساده', 'متوسط', 'تخصصی']);
    const specs = {
      material: cleanText(incomingSpecs.material, 120) || base.specs?.material || 'پلی‌کربنات',
      uvProtection:
        typeof incomingSpecs.uvProtection === 'boolean'
          ? incomingSpecs.uvProtection
          : Boolean(base.specs?.uvProtection),
      uvCoatingType: cleanText(incomingSpecs.uvCoatingType, 120) || base.specs?.uvCoatingType || 'ثبت نشده',
      heatResistance: cleanText(incomingSpecs.heatResistance, 120) || base.specs?.heatResistance || 'ثبت نشده',
      oemMatch:
        typeof incomingSpecs.oemMatch === 'boolean' ? incomingSpecs.oemMatch : Boolean(base.specs?.oemMatch),
      originCountry: cleanText(incomingSpecs.originCountry, 80) || base.specs?.originCountry || 'ثبت نشده',
      warrantyMonths:
        typeof incomingSpecs.warrantyMonths === 'number' &&
        Number.isSafeInteger(incomingSpecs.warrantyMonths) &&
        incomingSpecs.warrantyMonths >= 0 &&
        incomingSpecs.warrantyMonths <= 120
          ? incomingSpecs.warrantyMonths
          : (base.specs?.warrantyMonths ?? 0),
      installationDifficulty: difficultyOptions.has(incomingSpecs.installationDifficulty)
        ? incomingSpecs.installationDifficulty
        : (base.specs?.installationDifficulty ?? 'تخصصی'),
      oemCode: cleanText(incomingSpecs.oemCode, 60) || base.specs?.oemCode || undefined,
      fitmentYears: cleanText(incomingSpecs.fitmentYears, 80) || base.specs?.fitmentYears || car?.years || '',
    };

    const product = {
      ...base,
      id: id || 'sc-' + randomBytes(7).toString('hex'),
      titleFa,
      titleEn: base.titleEn ?? '',
      category,
      position: categories[category],
      brandId: brand?.id ?? 'all',
      modelId: car?.id ?? 'all',
      brandNameFa: brand?.nameFa ?? 'همه برندها',
      modelNameFa: car?.nameFa ?? 'همه مدل‌ها',
      years: car?.years ?? '',
      priceSingle,
      pricePair,
      stockCount,
      inStock: stockCount > 0,
      image,
      gallery,
      rating: base.rating ?? 0,
      reviewsCount: base.reviewsCount ?? 0,
      features: base.features ?? [],
      tags: base.tags ?? [],
      compatibilityNotes,
      specs,
      description,
    };

    if (base.priceSingle !== priceSingle || base.pricePair !== pricePair) {
      delete product.originalPriceSingle;
      delete product.originalPricePair;
      delete product.discountPercent;
    }

    if (row) {
      writeProduct.run(JSON.stringify(product), Number(data.active === true), id);
    } else {
      db.prepare('INSERT INTO products(id,payload,active) VALUES(?,?,?)').run(
        product.id,
        JSON.stringify(product),
        Number(data.active === true),
      );
    }
  });
  res.json({ ok: true });
});

app.post('/api/admin/products/delete', requireAdmin, (req, res) => {
  atomic(() => {
    const id = cleanText(req.body?.id, 70);
    const version = req.body?.version;
    if (!id) fail(400, 'شناسه محصول معتبر نیست.');
    const row = findProduct(id);
    if (!row) fail(404, 'محصول موردنظر پیدا نشد.');
    if (row.version !== version) {
      fail(409, 'این کالا تغییر کرده است. اطلاعات را تازه کنید.');
    }
    db.prepare('DELETE FROM products WHERE id=?').run(id);
  });
  res.json({ ok: true });
});

app.post('/api/admin/orders', requireAdmin, (req, res) => {
  atomic(() => {
    const row = getOrder(cleanText(req.body?.id, 32));
    if (!row) fail(404, 'سفارش پیدا نشد.');

    const order = JSON.parse(row.payload);
    const status = req.body?.status;
    if (req.body?.previousStatus !== order.status || (status !== order.status && !nextStatus[order.status]?.includes(status))) {
      fail(409, 'تغییر وضعیت مجاز نیست. اطلاعات را تازه کنید.');
    }

    const carrierCode = cleanText(req.body?.carrierCode, 100);
    if (['shipped', 'delivered'].includes(status) && !carrierCode) {
      fail(400, 'کد رهگیری مرسوله را وارد کنید.');
    }

    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const item of order.items) {
        const p = findProduct(item.productId);
        if (!p) continue;
        const product = publicProduct(p);
        const restoredUnits = unitsForItem(item.selectedSide as OrderSide, item.quantity, product.category);
        product.stockCount += restoredUnits;
        product.inStock = product.stockCount > 0;
        writeProduct.run(JSON.stringify(product), p.active, p.id);
      }
    }

    writeOrder.run(JSON.stringify({ ...order, status, carrierCode }), order.id);
  });
  res.json({ ok: true });
});

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const { standard, express, free, open } = req.body ?? {};
  db.prepare('UPDATE settings SET standard=?, express=?, free=?, open=? WHERE id=1').run(
    integer(standard, 0, 1000000000),
    integer(express, 0, 1000000000),
    integer(free, 0, 1000000000),
    Number(open === true),
  );
  res.json({ ok: true });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'مسیر پیدا نشد.' });
});

app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  if (!error?.status) console.error(error);
  const status = typeof error?.status === 'number' ? error.status : 500;
  const message = error?.status && !error?.type ? error.message : 'مشکلی در انجام درخواست پیش آمد.';
  res.status(status).json({ error: message });
});

async function startServer() {
  const distDir = fileURLToPath(new URL('./dist/', import.meta.url));
  const distIndex = fileURLToPath(new URL('./dist/index.html', import.meta.url));
  const isTsxRuntime = process.execArgv.some((arg) => arg.includes('tsx'));
  const isApiOnly = process.env.SADEGH_API_ONLY === '1';
  const useStaticDist =
    process.env.NODE_ENV === 'production' ||
    isApiOnly ||
    (!isTsxRuntime && process.env.SADEGH_DEV !== '1' && fs.existsSync(distIndex));

  if (useStaticDist) {
    if (fs.existsSync(distIndex)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(distIndex);
      });
    }
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(
    process.env.SADEGH_PORT || (useStaticDist ? process.env.PORT || 3000 : 3000),
  );
  const host = process.env.SADEGH_HOST || '0.0.0.0';
  app.listen(port, host, () => {
    console.log(`Server listening on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  void startServer();
}
