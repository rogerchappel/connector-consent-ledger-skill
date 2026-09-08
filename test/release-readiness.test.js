import assert from "node:assert/strict";
import test from "node:test";

import { validateWorkflow } from "../scripts/release-readiness-workflow.mjs";

const checkoutV7 = "3d3c42e5aac5ba805825da76410c181273ba90b1";
const setupNodeV7 = "820762786026740c76f36085b0efc47a31fe5020";

function workflow({ checkout = checkoutV7, setupNode = setupNodeV7 } = {}) {
  return `permissions:\n  contents: read\nnode-version: [20, 24]\nuses: actions/checkout@${checkout} # v7.0.1\nuses: actions/setup-node@${setupNode} # v7.0.0\nrun: npm ci\n`;
}

test("accepts the reviewed checkout and setup-node v7 pins", () => {
  assert.deepEqual(validateWorkflow(workflow()), []);
});

test("rejects stale or substituted action pins", () => {
  const failures = validateWorkflow(workflow({
    checkout: "11d5960a326750d5838078e36cf38b85af677262",
    setupNode: "49933ea5288caeca8642d1e84afbd3f7d6820020"
  }));

  assert.deepEqual(failures, [
    "checkout must use the reviewed actions/checkout v7.0.1 commit",
    "setup-node must use the reviewed actions/setup-node v7.0.0 commit"
  ]);
});
