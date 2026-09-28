// Integration test against the configured database; removes only its own fixtures.
require("dotenv").config({ quiet: true });
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../src/lib/prisma");

async function main() {
  const ids = Array.from({ length: 4 }, () => randomUUID());
  let server;
  try {
    for (const [index, id] of ids.entries()) {
      await prisma.user.create({ data: { id, name: `Chat test ${index}`, email: `${id}@example.invalid`, password: "not-a-login-hash", role: index === 1 ? "SPECIALIST" : index === 3 ? "ADMIN" : "LEARNER",
        ...(index === 1 ? { specialist: { create: { domain: "Test", verification: "VERIFIED" } } } : {}) } });
    }
    const app = express();
    app.use(express.json());
    app.use("/api/messages", require("../src/routes/messages"));
    server = await new Promise(resolve => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
    const base = `http://127.0.0.1:${server.address().port}/api/messages`;
    async function request(index, path, method = "GET", body) {
      const token = index === null ? null : jwt.sign({ userId: ids[index], role: index === 1 ? "SPECIALIST" : index === 3 ? "ADMIN" : "LEARNER" }, process.env.JWT_SECRET);
      const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, data: await response.json() };
    }
    assert.equal((await request(null, "/contacts")).status, 401);
    assert.equal((await request(3, "/contacts")).status, 403);
    assert.equal((await request(1, `/${ids[2]}`, "POST", { text: "Unrelated learner" })).status, 403);
    assert.equal((await request(0, `/${ids[2]}`, "POST", { text: "Same role" })).status, 404);
    for (const text of ["  ", "x".repeat(4001), 42]) assert.equal((await request(0, `/${ids[1]}`, "POST", { text })).status, 400);
    const sent = await request(0, `/${ids[1]}`, "POST", { text: " Hello specialist " });
    assert.equal(sent.status, 201);
    assert.equal(sent.data.message.text, "Hello specialist");
    assert.equal(sent.data.message.senderId, ids[0]);
    let contacts = await request(1, "/contacts");
    assert.equal(contacts.data.contacts.find(c => c.id === ids[0]).unread, 1);
    assert.equal((await request(1, `/${ids[0]}`)).data.messages[0].text, "Hello specialist");
    assert.equal((await request(2, `/${ids[1]}`)).data.messages.length, 0);
    await request(2, `/${ids[1]}/read`, "PATCH", { ids: [sent.data.message.id] });
    assert.equal((await prisma.message.findUnique({ where: { id: sent.data.message.id } })).read, false);
    assert.equal((await request(1, `/${ids[0]}/read`, "PATCH", { ids: [sent.data.message.id] })).status, 200);
    contacts = await request(1, "/contacts");
    assert.equal(contacts.data.contacts.find(c => c.id === ids[0]).unread, 0);
    assert.equal((await request(1, `/${ids[0]}`, "POST", { text: "Hello learner" })).status, 201);
    await prisma.message.createMany({ data: Array.from({ length: 55 }, (_, i) => ({ senderId: ids[0], recipientId: ids[1], text: `History ${i}` })) });
    const page = await request(0, `/${ids[1]}`);
    assert.equal(page.data.messages.length, 50);
    assert.equal(page.data.hasMore, true);
    const older = await request(0, `/${ids[1]}?before=${page.data.messages[0].id}`);
    assert.equal(older.data.messages.length, 7);
    assert.equal(new Set([...page.data.messages, ...older.data.messages].map(m => m.id)).size, 57);
    assert.equal((await request(2, `/${ids[1]}?before=${page.data.messages[0].id}`)).status, 400);
    console.log("Chat integration passed: authentication, access isolation, validation, two-way delivery, unread counts, and pagination.");
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
