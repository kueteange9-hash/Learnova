const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function setup(overrides = {}, payment = {}) {
  const routes = {};
  const workshop = { id: 'w1', specialistId: 'host', title: 'Workshop', description: 'Description', type: 'PAID', price: 5000, date: new Date(Date.now() + 86400000), meetingUrl: null };
  let updated;
  let registered = false;
  let saved;
  const prisma = {
    workshop: { findUnique: async () => ({ ...workshop, ...overrides }), update: async data => { updated = data.data; return { ...workshop, ...data.data }; } },
    workshopRegistration: { findUnique: async () => payment.existing || null, create: async ({ data }) => { registered = true; saved = { id: "registration", ...data }; return saved; }, update: async ({ data }) => ({ ...(saved || payment.existing), ...data }) },
  };
  const router = Object.fromEntries(['get', 'post', 'patch', 'delete'].map(method => [method, (url, ...handlers) => { routes[`${method} ${url}`] = handlers.at(-1); }]));
  const multer = Object.assign(() => ({ single: () => () => {} }), { diskStorage: () => ({}) });
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/routes/workshops.js'), 'utf8'), { require: name => name === 'express' ? { Router: () => router } : name === 'multer' ? multer : name === 'path' ? path : name.includes('prisma') ? prisma : name.includes('campay') ? { requestCollection: async () => ({ reference: 'ref' }), getTransaction: async () => payment.transaction } : { requireAuth() {}, requireRole: () => () => {} }, __dirname, module: {}, console });
  return { async call(route, body = {}, file) { const response = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } }; await routes[route]({ params: { id: 'w1' }, auth: { userId: 'host' }, body, file }, response); return response; }, get updated() { return updated; }, get registered() { return registered; } };
}
test('paid registration cannot record a payment or grant a place without a provider', async () => {
  const app = setup(); const result = await app.call('post /:id/register', { paymentMethod: 'MOMO' });
  assert.equal(result.code, 400); assert.equal(app.registered, false);
});
test('free registration reserves a place', async () => {
  const app = setup({ type: 'FREE' }); const result = await app.call('post /:id/register');
  assert.equal(result.code, 201); assert.equal(app.registered, true);
});
test('past workshops cannot accept registrations', async () => {
  const app = setup({ type: 'FREE', date: new Date(0) }); const result = await app.call('post /:id/register');
  assert.equal(result.code, 400); assert.equal(app.registered, false);
});
test('editing a meeting link preserves the workshop price', async () => {
  const app = setup(); await app.call('patch /:id', { meetingUrl: 'https://example.com/room' });
  assert.equal(app.updated.price, 5000); assert.equal(app.updated.type, 'PAID');
});
test('meeting links reject executable URL schemes', async () => {
  const app = setup(); const result = await app.call('patch /:id', { meetingUrl: 'javascript:alert(1)' });
  assert.equal(result.code, 400); assert.equal(app.updated, undefined);
});

test('workshop edits save details and replace the cover', async () => {
  const app = setup({ image: '/uploads/old.jpg' });
  const date = new Date(Date.now() + 172800000).toISOString();
  const result = await app.call('patch /:id', { title: ' New title ', description: 'New description', date, type: 'PAID', price: '7500' }, { filename: 'new.jpg' });
  assert.equal(result.code, 200);
  assert.equal(app.updated.title, 'New title');
  assert.equal(app.updated.description, 'New description');
  assert.equal(app.updated.date.toISOString(), date);
  assert.equal(app.updated.price, 7500);
  assert.equal(app.updated.image, '/uploads/new.jpg');
});
test('edits preserve the cover unless explicitly removed', async () => {
  const app = setup({ image: '/uploads/old.jpg' });
  await app.call('patch /:id', { title: 'Updated' });
  assert.equal(app.updated.image, '/uploads/old.jpg');
  await app.call('patch /:id', { removeImage: 'true', type: 'FREE', price: '5000' });
  assert.equal(app.updated.image, null);
  assert.equal(app.updated.price, null);
});
test('past workshop details can be edited without changing its original time', async () => {
  const date = '2020-01-01T12:30:45.000Z';
  const app = setup({ date });
  assert.equal((await app.call('patch /:id', { date, title: 'Updated' })).code, 200);
  assert.equal((await app.call('patch /:id', { date: '2020-01-02T12:30:00.000Z' })).code, 400);
});
test('invalid paid prices and empty descriptions are rejected', async () => {
  for (const body of [{ price: '0' }, { price: 'NaN' }, { description: '   ' }, { type: 'OTHER' }]) {
    const app = setup();
    assert.equal((await app.call('patch /:id', body)).code, 400);
    assert.equal(app.updated, undefined);
  }
});
test('a specialist cannot edit another host workshop', async () => {
  const app = setup({ specialistId: 'someone-else' });
  assert.equal((await app.call('patch /:id', { title: 'Changed' })).code, 404);
  assert.equal(app.updated, undefined);
});

test('initiating a paid collection does not confirm registration', async () => {
  const app = setup();
  const result = await app.call('post /:id/register', { paymentMethod: 'MOMO', phone: '670000000' });
  assert.equal(result.code, 202);
  assert.equal(result.data.registration.paymentStatus, 'PENDING');
  assert.equal(result.data.registration.status, 'PENDING');
  assert.equal(result.data.registration.paymentReference, 'ref');
});
for (const status of ['PENDING', 'FAILED', 'SUCCESSFUL']) {
  test(`provider ${status} determines admission`, async () => {
    const app = setup({}, { existing: { id: 'r', paymentReference: 'ref', paymentAmount: 5000, paymentStatus: 'PENDING', status: 'PENDING' }, transaction: { reference: 'ref', amount: 5000, currency: 'XAF', status } });
    const result = await app.call('get /:id/payment');
    assert.equal(result.data.registration.paymentStatus, status === 'SUCCESSFUL' ? 'COMPLETED' : status);
    assert.equal(result.data.registration.status, status === 'SUCCESSFUL' ? 'REGISTERED' : status);
  });
}
test('wrong payment amount cannot grant admission', async () => {
  const app = setup({}, { existing: { paymentReference: 'ref', paymentAmount: 5000, paymentStatus: 'PENDING' }, transaction: { reference: 'ref', amount: 1, currency: 'XAF', status: 'SUCCESSFUL' } });
  assert.equal((await app.call('get /:id/payment')).code, 409);
});
test('legacy pending registrations require verification without a second charge', async () => {
  const app = setup({}, { existing: { paymentStatus: 'PENDING', status: 'REGISTERED' } });
  assert.equal((await app.call('post /:id/register')).code, 202);
  assert.equal(app.registered, false);
  assert.equal((await app.call('get /:id/payment')).code, 409);
});
