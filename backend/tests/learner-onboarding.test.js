const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const { options, validatePreferences } = require("../src/lib/learnerPreferences");
const valid = () => ({ interests: [options.interests[0]], goals: [options.goals[0]], formats: [options.formats[0]], stage: options.stage[0], aspiration: " My next step ", complete: true });

test("completion requires interests, goals, formats and a current stage", () => {
  assert.equal(validatePreferences(valid()), null);
  for (const key of ["interests", "goals", "formats"]) assert.ok(validatePreferences({ ...valid(), [key]: [] }));
  assert.ok(validatePreferences({ ...valid(), stage: "" }));
  assert.equal(validatePreferences({ ...valid(), goals: [], formats: [], stage: "", complete: false }), null);
});
test("rejects unknown choices, duplicates, malformed and oversized answers", () => {
  for (const body of [null, {}, { ...valid(), interests: ["unknown"] }, { ...valid(), goals: [options.goals[0], options.goals[0]] }, { ...valid(), formats: "workshops" }, { ...valid(), aspiration: "x".repeat(501) }, { ...valid(), complete: "true" }]) assert.ok(validatePreferences(body));
});

function setup() {
  const routes = {}; let saved; let middleware;
  const router = { use: (...args) => { middleware = args; }, get: (url, fn) => { routes.get = fn; }, put: (url, fn) => { routes.put = fn; } };
  const prisma = { learnerProfile: { findUnique: async ({ where }) => ({ userId: where.userId, ...valid() }), upsert: async args => { saved = args; return args.update; } } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/routes/learners.js"), "utf8"), {
    require: name => name === "express" ? { Router: () => router } : name.includes("prisma") ? prisma : name.includes("middleware") ? { requireAuth: "authenticated", requireRole: role => role } : { options, validatePreferences }, module: {}, console,
  });
  return { get saved() { return saved; }, middleware, async request(method, body) {
    const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    await routes[method]({ auth: { userId: "signed-in-learner" }, body }, res);
    return res;
  } };
}
test("reads and writes only the authenticated learner's preferences", async () => {
  const app = setup();
  assert.deepEqual(app.middleware, ["authenticated", "LEARNER"]);
  assert.equal((await app.request("get")).data.profile.userId, "signed-in-learner");
  assert.equal((await app.request("put", { ...valid(), userId: "someone-else" })).code, 200);
  assert.equal(app.saved.where.userId, "signed-in-learner");
  assert.equal(app.saved.create.userId, "signed-in-learner");
  assert.equal(app.saved.update.aspiration, "My next step");
  assert.ok(app.saved.update.completedAt);
});
test("drafts preserve completion and invalid requests never write", async () => {
  const app = setup();
  assert.equal((await app.request("put", {})).code, 400);
  assert.equal(app.saved, undefined);
  await app.request("put", { ...valid(), complete: false });
  assert.equal(Object.hasOwn(app.saved.update, "completedAt"), false);
});
