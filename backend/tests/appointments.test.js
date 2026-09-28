const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

function setup(overrides = {}, count = 1, verification = "VERIFIED", following = true) {
  const routes = {};
  const appointment = {
    id: "a1",
    learnerId: "learner",
    specialistId: "specialist",
    status: "PENDING",
    format: "Video",
    date: new Date(Date.now() + 86400000),
    endDate: new Date(Date.now() + 90000000),
    updatedAt: new Date(),
    availabilitySlotId: "slot",
    meetingUrl: null,
    specialistNotes: null,
    ...overrides,
  };

  let changes;
  let released = false;
  let notification;

  const prisma = {
    specialist: {
      findUnique: async () => ({ verification }),
    },
    specialistFollow: {
      findUnique: async () => (following ? { learnerId: "learner", specialistId: "specialist" } : null),
    },
    appointment: {
      findUnique: async () => ({ ...appointment, ...changes }),
      updateMany: async ({ data }) => {
        if (count) changes = data;
        return { count };
      },
    },
    availabilitySlot: {
      findUnique: async () => ({
        id: "slot",
        specialist: { userId: "specialist", verification, sessionFormats: ["Video"] },
        booked: false,
        startsAt: new Date(Date.now() + 3600000),
        endsAt: new Date(Date.now() + 7200000),
      }),
      update: async () => {
        released = true;
      },
      updateMany: async () => ({ count: 1 }),
    },
    notification: {
      create: async ({ data }) => {
        notification = data;
      },
    },
    $transaction: async (fn) => fn(prisma),
  };

  const router = {
    use() {},
    ...Object.fromEntries(
      ["get", "post", "patch"].map((method) => [
        method,
        (url, handler) => {
          routes[`${method} ${url}`] = handler;
        },
      ]),
    ),
  };

  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/routes/appointments.js"), "utf8"), {
    require: (name) => (name === "express" ? { Router: () => router } : name.includes("prisma") ? prisma : { requireAuth() {} }),
    module: {},
    console,
    URL,
  });

  return {
    async post(body, userId = "learner") {
      const res = {
        code: 200,
        status(code) {
          this.code = code;
          return this;
        },
        json(data) {
          this.data = data;
          return this;
        },
      };
      await routes["post /"]({ auth: { userId, role: "LEARNER" }, body }, res);
      return res;
    },
    async patch(body, userId = "specialist") {
      const res = {
        code: 200,
        status(code) {
          this.code = code;
          return this;
        },
        json(data) {
          this.data = data;
          return this;
        },
      };
      await routes["patch /:id"]({ params: { id: "a1" }, auth: { userId }, body }, res);
      return res;
    },
    get changes() {
      return changes;
    },
    get released() {
      return released;
    },
    get notification() {
      return notification;
    },
  };
}

test("learners must follow a specialist before booking an appointment", async () => {
  const app = setup({}, 1, "VERIFIED", false);
  assert.equal((await app.post({ specialistId: "specialist", slotId: "slot", format: "Video" })).code, 403);
});

test("video confirmation requires a usable link", async () => {
  for (const meetingUrl of ["", "javascript:alert(1)", "https://", "https://host:secret@example.com", 123]) {
    const app = setup();
    assert.equal((await app.patch({ status: "CONFIRMED", meetingUrl })).code, 400);
    assert.equal(app.changes, undefined);
  }
});

test("confirming saves shared details and notifies the learner", async () => {
  const app = setup();
  assert.equal(
    (await app.patch({
      status: "CONFIRMED",
      meetingUrl: " https://example.com/meeting ",
      specialistNotes: " Bring questions ",
    })).code,
    200,
  );
  assert.equal(app.changes.meetingUrl, "https://example.com/meeting");
  assert.equal(app.changes.specialistNotes, "Bring questions");
  assert.equal(app.notification.userId, "learner");
});

test("confirmed meeting details can change without a status transition", async () => {
  const app = setup({ status: "CONFIRMED", meetingUrl: "https://example.com/old", specialistNotes: "Old" });
  assert.equal((await app.patch({ meetingUrl: "https://example.com/new", specialistNotes: "" })).code, 200);
  assert.equal(app.changes.status, "CONFIRMED");
  assert.equal(app.changes.specialistNotes, null);
  assert.equal(app.notification.title, "Meeting details updated");
});

test("learners cannot change meeting details or confirm sessions", async () => {
  for (const body of [{ status: "CONFIRMED" }, { meetingUrl: "https://example.com" }, { status: "CANCELLED", specialistNotes: "Changed" }]) {
    const app = setup();
    assert.equal((await app.patch(body, "learner")).code, 403);
    assert.equal(app.changes, undefined);
  }
});

test("unverified specialists cannot confirm sessions or edit meeting details", async () => {
  const app = setup({}, 1, "PENDING");
  assert.equal((await app.patch({ status: "CONFIRMED", meetingUrl: "https://example.com" })).code, 403);
});

test("cancelling releases the slot and notifies the other participant", async () => {
  const app = setup();
  assert.equal((await app.patch({ status: "CANCELLED" }, "learner")).code, 200);
  assert.equal(app.changes.availabilitySlotId, null);
  assert.equal(app.released, true);
  assert.equal(app.notification.userId, "specialist");
});

test("completion requires a confirmed session that has ended", async () => {
  for (const overrides of [{}, { status: "CONFIRMED" }]) {
    assert.equal((await setup(overrides).patch({ status: "COMPLETED" })).code, 409);
  }
  const app = setup({ status: "CONFIRMED", date: new Date(0), endDate: new Date(1000) });
  assert.equal((await app.patch({ status: "COMPLETED" })).code, 200);
});

test("closed appointments and concurrent changes cannot release a slot", async () => {
  for (const status of ["COMPLETED", "CANCELLED"]) {
    const app = setup({ status });
    assert.equal((await app.patch({ status: "CANCELLED" })).code, 409);
    assert.equal(app.released, false);
  }
  const app = setup({}, 0);
  assert.equal((await app.patch({ status: "CANCELLED" })).code, 409);
  assert.equal(app.released, false);
});

test("in-person confirmation requires location instructions; chat uses in-app messaging", async () => {
  assert.equal((await setup({ format: "In-person" }).patch({ status: "CONFIRMED" })).code, 400);
  assert.equal((await setup({ format: "In-person" }).patch({ status: "CONFIRMED", specialistNotes: "Room 2, Main Street" })).code, 200);
  assert.equal((await setup({ format: "Chat" }).patch({ status: "CONFIRMED" })).code, 200);
});

test("outsiders cannot modify appointments and expired requests cannot be confirmed", async () => {
  assert.equal((await setup().patch({ status: "CANCELLED" }, "outsider")).code, 404);
  assert.equal((await setup({ date: new Date(0) }).patch({ status: "CONFIRMED", meetingUrl: "https://example.com" })).code, 409);
});
