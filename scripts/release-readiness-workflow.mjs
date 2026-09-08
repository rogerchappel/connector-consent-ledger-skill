const CHECKOUT_V7 = "3d3c42e5aac5ba805825da76410c181273ba90b1";
const SETUP_NODE_V7 = "820762786026740c76f36085b0efc47a31fe5020";

export function validateWorkflow(workflow) {
  const failures = [];
  const requireField = (condition, message) => {
    if (!condition) failures.push(message);
  };

  requireField(/^permissions:\n  contents: read$/m.test(workflow), "CI permissions must remain contents: read");
  requireField(/node-version: \[20, 24\]/.test(workflow), "CI must test Node 20 and Node 24");
  requireField(
    workflow.includes(`actions/checkout@${CHECKOUT_V7} # v7.0.1`),
    "checkout must use the reviewed actions/checkout v7.0.1 commit"
  );
  requireField(
    workflow.includes(`actions/setup-node@${SETUP_NODE_V7} # v7.0.0`),
    "setup-node must use the reviewed actions/setup-node v7.0.0 commit"
  );
  requireField(/run: npm ci/.test(workflow), "CI must install with npm ci");
  requireField(!/run: npm install/.test(workflow), "CI must not fall back to npm install");

  return failures;
}
