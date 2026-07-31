import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePlan, parsePlanText } from "../src/parse.js";

test("accepts documented plan roots", () => {
  const action = { connector: "browser", action: "inspect", sideEffect: "read" };

  assert.deepEqual(parsePlanText(JSON.stringify([action])).actions, [action]);
  assert.deepEqual(parsePlanText(JSON.stringify({ actions: [action] })).actions, [action]);
  assert.deepEqual(parsePlanText(JSON.stringify(action)).actions, [action]);
  assert.deepEqual(parsePlanText("[]"), { actions: [] });
  assert.deepEqual(parsePlanText('{"actions":[]}'), { actions: [] });
});

test("rejects blank and unknown plan roots", () => {
  assert.throws(() => parsePlanText(" \n"), /input: plan is blank/);
  assert.throws(() => parsePlanText("null"), /input: plan root must be an object or array/);
  assert.throws(() => parsePlanText("42"), /input: plan root must be an object or array/);
  assert.throws(
    () => parsePlanText('{"actons":[{"connector":"crm","action":"send"}]}'),
    /input: unrecognized plan object/
  );
});

test("rejects malformed action collections and entries", () => {
  assert.throws(() => normalizePlan({ actions: null }), /actions must be an array/);
  assert.throws(() => normalizePlan({ actions: {} }), /actions must be an array/);
  assert.throws(() => normalizePlan({ actions: [null] }), /actions\[0\] must be an object/);
  assert.throws(() => normalizePlan({ actions: ["send"] }), /actions\[0\] must be an object/);
  assert.throws(() => normalizePlan({ actions: [{}] }), /actions\[0\] has no recognized action fields/);
});
