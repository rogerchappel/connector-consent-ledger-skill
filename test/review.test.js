import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePlanText } from "../src/parse.js";
import { reviewPlan } from "../src/review.js";
import { renderMarkdown } from "../src/render.js";

test("classifies connector side effects", () => {
  const report = reviewPlan({ actions: [
    { connector: "slack", action: "search", sideEffect: "read" },
    { connector: "crm", action: "update", sideEffect: "crm-write" },
    { connector: "crm", action: "update", sideEffect: "crm-write", evidence: "approval ticket" },
    { connector: "vault", action: "export", sideEffect: "credential-export" }
  ] });
  assert.deepEqual(report.actions.map((action) => action.state), ["read-only", "ask-first", "approved", "blocked"]);
});

test("parses simple yaml action lists", () => {
  const plan = parsePlanText("name: demo\nactions:\n  - connector: browser\n    action: inspect\n    sideEffect: read\n");
  assert.equal(plan.actions[0].connector, "browser");
});

test("renders markdown evidence table", () => {
  const report = reviewPlan({ actions: [{ connector: "fs", action: "draft", sideEffect: "local-write" }] });
  assert.match(renderMarkdown(report), /\| draft \| fs \| draft/);
});
