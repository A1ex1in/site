const test = require("node:test");
const assert = require("node:assert/strict");
const { requireAdmin } = require("../middleware/auth");

test("requireAdmin пропускает администратора", () => {
  let nextCalled = false;
  requireAdmin({ user: { role: "admin" } }, {}, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test("requireAdmin запрещает доступ другим ролям", () => {
  let statusCode;
  let payload;
  const response = {
    status(code) { statusCode = code; return this; },
    json(value) { payload = value; return this; }
  };
  requireAdmin({ user: { role: "teacher" } }, response, () => {});
  assert.equal(statusCode, 403);
  assert.equal(payload.error, "Доступ разрешён только администратору");
});
