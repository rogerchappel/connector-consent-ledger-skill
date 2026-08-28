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

test("an explicit blocked state overrides a read-like side effect consistently", () => {
  const report = reviewPlan({ actions: [
    { id: "explicit-block", connector: "crm", action: "inspect", sideEffect: "read", state: "blocked" }
  ] });

  assert.deepEqual(report.summary, { total: 1, counts: { blocked: 1 }, highestState: "blocked" });
  assert.equal(report.actions[0].state, "blocked");
  assert.equal(report.actions[0].reason, "Plan explicitly marks this action as blocked.");
  assert.match(renderMarkdown(report), /\| blocked \| crm \| inspect \| unspecified \| Plan explicitly marks this action as blocked\. \|/);
});

test("rejects unsupported or malformed explicit states", () => {
  for (const state of ["read-only", "Blocked", "", null, 42]) {
    assert.throws(
      () => reviewPlan({ actions: [{ sideEffect: "read", state }] }),
      /actions\[0\]\.state must be exactly "blocked"/
    );
  }
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

test("accepts supported custom policy overrides", () => {
  const report = reviewPlan({
    actions: [
      { sideEffect: "quarantine" },
      { sideEffect: "publish", evidence: "cab:CAB-19" }
    ]
  }, {
    blockedEffects: ["quarantine"],
    askFirstEffects: ["publish"],
    approvalEvidence: ["cab"]
  });

  assert.deepEqual(report.actions.map((action) => action.state), ["blocked", "approved"]);
});

test("normalizes surrounding whitespace in custom effect policy entries", () => {
  const policy = {
    blockedEffects: [" delete "],
    readOnlyEffects: [" inspect "],
    draftEffects: [" local-write "],
    askFirstEffects: [" publish "],
    approvalEvidence: [" cab "]
  };
  const report = reviewPlan({
    actions: [
      { sideEffect: "inspect/delete" },
      { sideEffect: "inspect/local-write" },
      { sideEffect: "local-write/publish" },
      { sideEffect: "publish", evidence: "CAB:19" },
      { sideEffect: "publish" }
    ]
  }, policy);

  assert.deepEqual(report.actions.map((action) => action.state), [
    "blocked",
    "read-only",
    "draft",
    "approved",
    "ask-first"
  ]);
});

test("rejects malformed and unknown custom policy properties", () => {
  for (const [policy, message] of [
    [null, "policy must be an object"],
    [[], "policy must be an object"],
    [{ blockedEffects: "delete" }, "policy.blockedEffects must be an array"],
    [{ readOnlyEffects: ["read", 42] }, "policy.readOnlyEffects[1] must be a non-empty string"],
    [{ approvalEvidence: ["approval", " "] }, "policy.approvalEvidence[1] must be a non-empty string"],
    [{ unknownEffects: ["write"] }, "unknown policy property: unknownEffects"]
  ]) {
    assert.throws(() => reviewPlan({ actions: [] }, policy), (error) =>
      error.message.toLowerCase() === message.toLowerCase()
    );
  }
});

test("parses simple yaml action lists", () => {
  const plan = parsePlanText("name: demo\nactions:\n  - connector: browser\n    action: inspect\n    sideEffect: read\n");
  assert.equal(plan.actions[0].connector, "browser");
});

test("preserves hashes in quoted yaml scalars and strips genuine comments", () => {
  const plan = parsePlanText(`name: "demo #1" # plan comment
actions:
  - connector: crm # connector comment
    action: update
    sideEffect: crm-write
    evidence: "approval: ticket #42" # evidence comment
  - connector: 'support #2'
    action: update
    sideEffect: crm-write
    evidence: 'approval: case #7' # another comment
`);

  assert.equal(plan.name, "demo #1");
  assert.deepEqual(plan.actions.map((action) => action.connector), ["crm", "support #2"]);
  assert.deepEqual(plan.actions.map((action) => action.evidence), [
    "approval: ticket #42",
    "approval: case #7"
  ]);
});

test("review rejects an unvalidated plan shape and represents empty plans explicitly", () => {
  assert.throws(() => reviewPlan({ actons: [] }), /unrecognized plan object/);
  const report = reviewPlan({ actions: [] });
  assert.deepEqual(report.summary, { total: 0, counts: {}, highestState: "none" });
});

test("renders markdown evidence table", () => {
  const report = reviewPlan({ actions: [{ connector: "fs", action: "draft", sideEffect: "local-write" }] });
  assert.match(renderMarkdown(report), /\| draft \| fs \| draft/);
});
