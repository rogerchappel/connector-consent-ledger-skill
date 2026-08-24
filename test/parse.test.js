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

test("rejects malformed action field values with exact paths", () => {
  const fields = [
    "id", "connector", "action", "operation", "target", "sideEffect",
    "side_effect", "effect", "risk"
  ];
  for (const field of fields) {
    for (const value of ["", "  ", 42, false, null, {}, []]) {
      assert.throws(
        () => normalizePlan({ actions: [{ [field]: value }] }),
        new RegExp(`actions\\[0\\]\\.${field} must be a non-empty string`)
      );
    }
  }
});

test("accepts documented evidence forms and rejects malformed entries", () => {
  assert.deepEqual(normalizePlan({ actions: [{ evidence: "ticket:42" }] }).actions[0].evidence, "ticket:42");
  assert.deepEqual(normalizePlan({ actions: [{ evidence: [] }] }).actions[0].evidence, []);
  assert.deepEqual(normalizePlan({ actions: [{ evidence: ["ticket:42"] }] }).actions[0].evidence, ["ticket:42"]);

  for (const value of ["", " ", 42, false, null, {}]) {
    assert.throws(
      () => normalizePlan({ actions: [{ evidence: value }] }),
      /actions\[0\]\.evidence must be a non-empty string or an array of non-empty strings/
    );
  }
  for (const value of ["", " ", 42, false, null, {}]) {
    assert.throws(
      () => normalizePlan({ actions: [{ evidence: ["ticket:42", value] }] }),
      /actions\[0\]\.evidence\[1\] must be a non-empty string/
    );
  }
});

test("tiny YAML rejects malformed scalar action fields with exact paths", () => {
  assert.throws(
    () => parsePlanText("actions:\n  - connector: false\n    action: inspect", "plan.yaml"),
    /plan\.yaml: actions\[0\]\.connector must be a non-empty string/
  );
  assert.throws(
    () => parsePlanText("actions:\n  - connector: crm\n    evidence: 42", "plan.yaml"),
    /plan\.yaml: actions\[0\]\.evidence must be a non-empty string or an array of non-empty strings/
  );
});

test("tiny YAML preserves nested evidence sequences in order", () => {
  const plan = parsePlanText(`actions:
  - connector: crm
    action: update
    sideEffect: crm-write
    evidence:
      - approval:ticket-42
      - reviewed-by:release-manager
`, "plan.yaml");

  assert.deepEqual(plan.actions[0].evidence, [
    "approval:ticket-42",
    "reviewed-by:release-manager"
  ]);
});

test("tiny YAML rejects malformed nested evidence entries with exact paths", () => {
  for (const [entry, index] of [["", 0], ["false", 1], ["42", 1]]) {
    const evidence = index === 0 ? `      - ${entry}` : `      - ticket:42\n      - ${entry}`;
    assert.throws(
      () => parsePlanText(`actions:\n  - connector: crm\n    evidence:\n${evidence}\n`, "plan.yaml"),
      new RegExp(`plan\\.yaml: actions\\[0\\]\\.evidence\\[${index}\\] must be a non-empty string`)
    );
  }
});
