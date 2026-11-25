import assert from 'node:assert/strict';

const origin = process.env.SADEGH_TEST_ORIGIN || 'http://127.0.0.1:4180';

async function call(path, data, options = {}) {
  const headers = {};
  if (data !== undefined) {
    headers['content-type'] = 'application/json';
    headers['origin'] = options.origin ?? origin;
  }
  if (options.token) {
    headers['authorization'] = `Bearer ${options.token}`;
  }
  if (options.extraHeaders) {
    Object.assign(headers, options.extraHeaders);
  }
  const response = await fetch(
    origin + '/api/' + path,
    data === undefined ? { headers } : { method: 'POST', headers, body: JSON.stringify(data) },
  );
  return [response.status, await response.json().catch(() => null)];
}

// 1. Public catalog
const [status, catalog] = await call('catalog');
assert.equal(status, 200);
assert.ok(catalog.products.length > 10);

const lens = catalog.products.find((p) => p.category === 'headlight' && p.inStock && p.stockCount >= 4);
const glue = catalog.products.find((p) => p.id === 'tlq-butyl-glue');
assert.ok(lens, 'Expected an in-stock headlight lens');
assert.ok(glue, 'Expected butyl glue accessory');

// 2. Protected admin routes MUST require authentication (401 without token)
assert.equal((await call('admin'))[0], 401);
assert.equal((await call('admin/settings', { standard: 1, express: 1, free: 0, open: true }))[0], 401);

// 3. First-run admin setup, lock, login, and logout
const [authStatusCode, authStatus] = await call('admin/auth/status');
assert.equal(authStatusCode, 200);
assert.equal(authStatus.needsSetup, true);

assert.equal((await call('admin/auth/setup', { password: 'short' }))[0], 400);
const [setupCode, setupBody] = await call('admin/auth/setup', { password: 'StrongAdminPass!2026' });
assert.equal(setupCode, 201);
assert.ok(setupBody.token);

// Setup must be permanently locked once claimed
assert.equal((await call('admin/auth/setup', { password: 'AnotherPassword!2026' }))[0], 403);

// Wrong password rejected
assert.equal((await call('admin/auth/login', { password: 'WrongPassword!' }))[0], 401);

// Logout revokes token
assert.equal((await call('admin/auth/logout', {}, { token: setupBody.token }))[0], 200);
assert.equal((await call('admin', undefined, { token: setupBody.token }))[0], 401);

// Re-login succeeds
const [loginCode, loginBody] = await call('admin/auth/login', { password: 'StrongAdminPass!2026' });
assert.equal(loginCode, 200);
const adminToken = loginBody.token;

// Authenticated admin read works
const [adminStatus, admin] = await call('admin', undefined, { token: adminToken });
assert.equal(adminStatus, 200);
const stale = admin.products.find((x) => x.id === lens.id);

const stock = async (id) => (await call('catalog'))[1].products.find((x) => x.id === id).stockCount;

// 4. Origin checks: cross-site blocked (403), HTTPS same-host via X-Forwarded-Host allowed!
const basePayload = {
  requestId: 'a'.repeat(32),
  customerName: 'خریدار نمونه',
  phone: '۰۹۱۲۰۰۰۰۰۰۰',
  city: 'تهران',
  province: 'تهران',
  address: 'نشانی آزمایشی، پلاک یک',
  postalCode: '', // optional postalCode must succeed!
  shippingMethod: 'tipax',
  items: [{ productId: lens.id, side: 'pair', quantity: 1, unitPrice: lens.pricePair }],
  totalAmount:
    lens.pricePair + (lens.pricePair >= catalog.settings.free ? 0 : catalog.settings.standard),
};

assert.equal((await call('orders', basePayload, { origin: 'https://evil.example.com' }))[0], 403);
assert.equal((await call('orders', { ...basePayload, totalAmount: 1 }))[0], 409);

// Invalid 5-digit postalCode rejected (400), empty postalCode accepted (201)
assert.equal((await call('orders', { ...basePayload, postalCode: '12345' }))[0], 400);

// Express shipping for non-Tehran rejected (400)
assert.equal(
  (await call('orders', { ...basePayload, city: 'شیراز', shippingMethod: 'express' }))[0],
  400,
);

// HTTPS custom domain same-origin via proxy header works (201)
const [created, order] = await call('orders', basePayload, {
  origin: 'https://shop.sadeghcheragh.ir',
  extraHeaders: { 'x-forwarded-host': 'shop.sadeghcheragh.ir', 'x-forwarded-proto': 'https' },
});
assert.equal(created, 201);
// Idempotent retry returns same tracking code
assert.equal((await call('orders', basePayload))[1].trackingCode, order.trackingCode);
// Pair order deducts 2 units from stock!
assert.equal(await stock(lens.id), lens.stockCount - 2);

// 5. Accessory order uses 'standard' side & priceSingle and deducts 1 unit
const gluePayload = {
  requestId: 'e'.repeat(32),
  customerName: 'خریدار چسب',
  phone: '09120000002',
  city: 'شیراز',
  province: 'فارس',
  address: 'شیراز، بلوار زند، پلاک ۱۰',
  postalCode: '',
  shippingMethod: 'tipax',
  items: [{ productId: glue.id, side: 'standard', quantity: 1, unitPrice: glue.priceSingle }],
  totalAmount:
    glue.priceSingle + (glue.priceSingle >= catalog.settings.free ? 0 : catalog.settings.standard),
};
// Reject invalid 'pair' side for accessory
assert.equal(
  (await call('orders', { ...gluePayload, requestId: 'f'.repeat(32), items: [{ productId: glue.id, side: 'pair', quantity: 1, unitPrice: glue.pricePair }] }))[0],
  400,
);
assert.equal((await call('orders', gluePayload))[0], 201);
assert.equal(await stock(glue.id), glue.stockCount - 1);

// 6. Private tracking check
assert.equal((await call('track', { code: order.trackingCode, phone: '09120000001' }))[0], 404);
const tracked = (await call('track', { code: order.trackingCode, phone: '09120000000' }))[1];
assert.equal(tracked.status, 'processing');
assert.equal(tracked.address, undefined);

// 7. Optimistic concurrency & order cancellation restores 2 units for pair
assert.equal((await call('admin/products', stale, { token: adminToken }))[0], 409);
assert.equal(
  (await call('admin/orders', { id: order.id, previousStatus: 'processing', status: 'shipped' }, { token: adminToken }))[0],
  409,
);
assert.equal(
  (await call('admin/orders', { id: order.id, previousStatus: 'processing', status: 'cancelled' }, { token: adminToken }))[0],
  200,
);
assert.equal(
  (await call('admin/orders', { id: order.id, previousStatus: 'cancelled', status: 'cancelled' }, { token: adminToken }))[0],
  200,
);
assert.equal(await stock(lens.id), lens.stockCount);

// 8. Concurrent orders race test
const singlePayload = {
  ...basePayload,
  items: [{ productId: lens.id, side: 'left', quantity: lens.stockCount, unitPrice: lens.priceSingle }],
  totalAmount:
    lens.priceSingle * lens.stockCount +
    (lens.priceSingle * lens.stockCount >= catalog.settings.free ? 0 : catalog.settings.standard),
};
const race = await Promise.all([
  call('orders', { ...singlePayload, requestId: 'b'.repeat(32) }),
  call('orders', { ...singlePayload, requestId: 'c'.repeat(32) }),
]);
assert.deepEqual(race.map((x) => x[0]).sort(), [201, 409]);
assert.equal(await stock(lens.id), 0);

const taken = race.find((x) => x[0] === 201)[1];
assert.equal(
  (await call('admin/orders', { id: taken.id, previousStatus: 'processing', status: 'packing' }, { token: adminToken }))[0],
  200,
);
assert.equal(
  (await call('admin/orders', { id: taken.id, previousStatus: 'packing', status: 'shipped' }, { token: adminToken }))[0],
  400,
);
assert.equal(
  (
    await call(
      'admin/orders',
      { id: taken.id, previousStatus: 'packing', status: 'shipped', carrierCode: 'TRACK-TEST' },
      { token: adminToken },
    )
  )[0],
  200,
);
assert.equal((await call('track', { code: taken.trackingCode, phone: '09120000000' }))[1].carrierCode, 'TRACK-TEST');

// 9. Admin settings toggle closes checkout
assert.equal(
  (await call('admin/settings', { standard: 63000, express: 110000, free: 0, open: false }, { token: adminToken }))[0],
  200,
);
assert.equal((await call('catalog'))[1].settings.standard, 63000);
assert.equal((await call('orders', { ...basePayload, requestId: 'd'.repeat(32) }))[0], 409);

// 10. Rate limit enforcement on auth login (429)
let hit429 = false;
for (let i = 0; i < 20; i++) {
  const [code] = await call('admin/auth/login', { password: 'bad-password' });
  if (code === 429) {
    hit429 = true;
    break;
  }
}
assert.equal(hit429, true, 'Expected rate limiter to trigger 429 on repeated login attempts');

// 11. SPA routes served properly
for (const path of ['/', '/products', '/track', '/guide', '/admin']) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /صادق چراغ/);
}

console.log(
  'Passed: admin auth (setup/lock/login/logout/401), HTTPS/domain origin checks, optional postalCode, pair 2x stock & accessory standard pricing, concurrency, rate limiting, and SPA routes.',
);
