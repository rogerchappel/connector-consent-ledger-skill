import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePlanText } from "../src/parse.js";
import { reviewPlan } from "../src/review.js";
import { renderMarkdown } from "../src/render.js";

test("classifies connector side effects", () => {
  const report = reviewPlan({ actions: [
    { connector: "slack", action: "search", sideEffect: "read" },
    { connector: "crm", action: "update", sideEffect: "crm-write" },
    { connector: "crm", action: "update", sideEffect: "crm-write", evidence: "approval:ticket #42" },
    { connector: "vault", action: "export", sideEffect: "credential-export" }
  ] });
  assert.deepEqual(report.actions.map((action) => action.state), ["read-only", "ask-first", "approved", "blocked"]);
});

test("matches canonical and compound effects without substring collisions", () => {
  const effects = [
    "bread",
    "read",
    "read-only",
    "bulk-delete",
    "credential-export",
    "crm-write:contacts",
    "local-write/dry-run",
    "unknown"
  ];
  const report = reviewPlan({
    actions: effects.map((sideEffect) => ({ sideEffect }))
  });

  assert.deepEqual(report.actions.map((action) => action.state), [
    "ask-first",
    "read-only",
    "read-only",
    "blocked",
    "blocked",
    "ask-first",
    "draft",
    "ask-first"
  ]);
});

test("applies blocked, read-only, draft, and ask-first precedence deterministically", () => {
  const effects = [
    "read/delete",
    "draft+search",
    "external-send,local-write",
    "unrecognized-effect"
  ];
  const report = reviewPlan({
    actions: effects.map((sideEffect) => ({ sideEffect }))
  });

  assert.deepEqual(report.actions.map((action) => action.state), [
    "blocked",
    "read-only",
    "draft",
    "ask-first"
  ]);
});

test("requires explicit approval evidence syntax", () => {
  const evidence = [
    "approval",
    "approval:ticket #42",
    "approval denied",
    "disapproval recorded",
    "preapproval",
    "ticketing note"
  ];
  const states = evidence.map((item) =>
    reviewPlan({ actions: [{ sideEffect: "crm-write", evidence: item }] }).actions[0].state
  );
  assert.deepEqual(states, [
    "approved",
    "approved",
    "ask-first",
    "ask-first",
    "ask-first",
    "ask-first"
  ]);
});

test("checks array entries independently and supports custom policy markers", () => {
  const policy = { approvalEvidence: ["change-control"] };
  const denied = reviewPlan({
    actions: [{ sideEffect: "crm-write", evidence: ["context only", "change-control denied"] }]
  }, policy);
  const approved = reviewPlan({
    actions: [{ sideEffect: "crm-write", evidence: ["context only", " CHANGE-CONTROL: CAB-19 "] }]
  }, policy);

  assert.equal(denied.actions[0].state, "ask-first");
  assert.equal(approved.actions[0].state, "approved");
  assert.deepEqual(approved.actions[0].evidence, ["context only", " CHANGE-CONTROL: CAB-19 "]);
});

test("parses simple yaml action lists", () => {
  const plan = parsePlanText("name: demo\nactions:\n  - connector: browser\n    action: inspect\n    sideEffect: read\n");
  assert.equal(plan.actions[0].connector, "browser");
});

test("renders markdown evidence table", () => {
  const report = reviewPlan({ actions: [{ connector: "fs", action: "draft", sideEffect: "local-write" }] });
  assert.match(renderMarkdown(report), /\| draft \| fs \| draft/);
});
