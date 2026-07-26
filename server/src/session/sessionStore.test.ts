import assert from "node:assert/strict";
import test from "node:test";
import { SessionStore } from "./sessionStore";

test("session tokens are one-time and expire", () => {
  const store = new SessionStore();
  const created = store.create("in-person", "en-to-zh", 1_000);

  assert.equal(store.consume(created.token, 1_001)?.id, created.id);
  assert.equal(store.consume(created.token, 1_002), undefined);
  assert.equal(store.get(created.id, 1_000 + 3_600_001), undefined);
});
