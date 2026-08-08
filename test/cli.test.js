import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const run = promisify(execFile);

async function runCli(...args) {
  return run(process.execPath, ["src/cli.js", ...args]);
}

async function rejectsCli(...args) {
  try {
    await runCli(...args);
    assert.fail("expected CLI command to fail");
  } catch (error) {
    return error;
  }
}

test("record does not persist negated evidence as approved", async () => {
  const directory = await mkdtemp(join(tmpdir(), "consent-ledger-test-"));
  const plan = join(directory, "plan.json");
  const ledger = join(directory, "ledger.jsonl");
  await writeFile(plan, JSON.stringify({
    actions: [{
      connector: "crm",
      action: "update",
      sideEffect: "crm-write",
      evidence: ["approval denied", "disapproval recorded"]
    }]
  }));

  const { stdout } = await run(process.execPath, [
    "src/cli.js",
    "record",
    plan,
    "--ledger",
    ledger,
    "--actor",
    "test"
  ]);
  const result = JSON.parse(stdout);
  const persisted = JSON.parse((await readFile(ledger, "utf8")).trim());

  assert.equal(result.entries[0].state, "ask-first");
  assert.equal(persisted.state, "ask-first");
  assert.deepEqual(persisted.evidence, ["approval denied", "disapproval recorded"]);
});

test("review accepts only explicit markdown and json formats", async () => {
  const markdown = await runCli("review", "fixtures/mixed-actions.json", "--format", "markdown");
  const json = await runCli("review", "fixtures/mixed-actions.json", "--format", "json");
  assert.match(markdown.stdout, /^# Connector Consent Report/);
  assert.equal(JSON.parse(json.stdout).summary.total, 5);

  for (const args of [
    ["review", "fixtures/mixed-actions.json", "--format", "yaml"],
    ["review", "fixtures/mixed-actions.json", "--format"]
  ]) {
    const error = await rejectsCli(...args);
    assert.equal(error.code, 1);
    assert.match(error.stderr, /--format requires one of: markdown, json/);
  }
});

test("review preserves quoted hash evidence in yaml plans", async () => {
  const directory = await mkdtemp(join(tmpdir(), "consent-ledger-yaml-test-"));
  const plan = join(directory, "plan.yaml");
  await writeFile(plan, `actions:
  - connector: crm # genuine comment
    action: update
    sideEffect: crm-write
    evidence: "approval: ticket #42" # genuine comment
`);

  const { stdout } = await runCli("review", plan, "--format", "json");
  const report = JSON.parse(stdout);
  assert.equal(report.actions[0].state, "approved");
  assert.deepEqual(report.actions[0].evidence, ["approval: ticket #42"]);
});

test("summarize accepts only explicit markdown and json formats", async () => {
  const directory = await mkdtemp(join(tmpdir(), "consent-ledger-summary-test-"));
  const ledger = join(directory, "ledger.jsonl");
  await writeFile(ledger, `${JSON.stringify({ state: "draft" })}\n`);

  const markdown = await runCli("summarize", ledger, "--format", "markdown");
  const json = await runCli("summarize", ledger, "--format", "json");
  assert.match(markdown.stdout, /^# Consent Ledger Summary/);
  assert.equal(JSON.parse(json.stdout).total, 1);

  for (const args of [
    ["summarize", ledger, "--format", "yaml"],
    ["summarize", ledger, "--format"]
  ]) {
    const error = await rejectsCli(...args);
    assert.equal(error.code, 1);
    assert.match(error.stderr, /--format requires one of: markdown, json/);
  }
});

test("commands reject unknown options and extra positional arguments", async () => {
  for (const args of [
    ["review", "fixtures/mixed-actions.json", "--formt", "json"],
    ["review", "fixtures/mixed-actions.json", "unexpected"],
    ["record", "fixtures/mixed-actions.json", "--ledger", "ledger.jsonl", "--format", "json"],
    ["summarize", "ledger.jsonl", "unexpected"],
    ["init-policy", "unexpected"]
  ]) {
    const error = await rejectsCli(...args);
    assert.equal(error.code, 1);
    assert.match(error.stderr, /(?:Unknown option|Unexpected argument):/);
    assert.match(error.stderr, /Usage:/);
  }
});

test("value-bearing options reject missing values", async () => {
  const cases = [
    ["review", "fixtures/mixed-actions.json", "--policy"],
    ["record", "fixtures/mixed-actions.json", "--ledger"],
    ["record", "fixtures/mixed-actions.json", "--actor"],
    ["record", "fixtures/mixed-actions.json", "--note"],
    ["init-policy", "--out"],
    ["review", "fixtures/mixed-actions.json", "--format"],
    ["review", "fixtures/mixed-actions.json", "--fail-on"]
  ];

  for (const args of cases) {
    const error = await rejectsCli(...args);
    assert.equal(error.code, 1);
    assert.match(error.stderr, /Option --[\w-]+ requires a value/);
    assert.match(error.stderr, /Usage:/);
  }
});

test("review --fail-on exits 2 for every supported consent state", async () => {
  for (const state of ["read-only", "draft", "approved", "ask-first", "blocked"]) {
    const error = await rejectsCli("review", "fixtures/mixed-actions.json", "--fail-on", state);
    assert.equal(error.code, 2, state);
    assert.match(error.stdout, /^# Connector Consent Report/, state);
    assert.equal(error.stderr, "", state);
  }
});

test("review --fail-on exits 0 when the selected state is absent", async () => {
  const directory = await mkdtemp(join(tmpdir(), "consent-ledger-fail-on-test-"));
  const plan = join(directory, "read-only.json");
  await writeFile(plan, JSON.stringify({ actions: [{ sideEffect: "read" }] }));

  const result = await runCli("review", plan, "--fail-on", "blocked");
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /Highest state: read-only/);
});

test("review --fail-on rejects unknown and case-mismatched states before rendering", async () => {
  for (const state of ["blockd", "Blocked", "none", ""]) {
    const args = state
      ? ["review", "fixtures/mixed-actions.json", "--fail-on", state]
      : ["review", "fixtures/mixed-actions.json", "--fail-on"];
    const error = await rejectsCli(...args);
    assert.equal(error.code, 1, state);
    assert.equal(error.stdout, "", state);
    assert.match(error.stderr, state
      ? /--fail-on requires one of: read-only, draft, approved, ask-first, blocked/
      : /Option --fail-on requires a value/);
    assert.match(error.stderr, /Usage:/);
  }
});

test("review and record reject invalid plans before producing output", async () => {
  const directory = await mkdtemp(join(tmpdir(), "consent-ledger-invalid-plan-"));
  const ledger = join(directory, "ledger.jsonl");
  const cases = [
    ["blank.yaml", ""],
    ["misspelled.json", '{"actons":[{"connector":"crm","action":"send"}]}'],
    ["malformed.json", '{"actions":[null]}'],
    ["null.json", "null"]
  ];

  for (const [name, contents] of cases) {
    const plan = join(directory, name);
    await writeFile(plan, contents);
    for (const args of [
      ["review", plan, "--format", "json"],
      ["record", plan, "--ledger", ledger]
    ]) {
      const error = await rejectsCli(...args);
      assert.equal(error.code, 1);
      assert.equal(error.stdout, "");
      assert.match(error.stderr, /(?:plan is blank|unrecognized plan object|must be an object)/);
    }
  }

  await assert.rejects(readFile(ledger, "utf8"), { code: "ENOENT" });
});

test("review and record reject invalid policies before output or ledger append", async () => {
  const directory = await mkdtemp(join(tmpdir(), "consent-ledger-invalid-policy-"));
  const ledger = join(directory, "ledger.jsonl");
  const cases = [
    ["scalar.json", '"policy"', /policy must be an object/],
    ["wrong-shape.json", '{"blockedEffects":"delete"}', /policy\.blockedEffects must be an array/],
    ["empty-entry.json", '{"approvalEvidence":[""]}', /policy\.approvalEvidence\[0\] must be a non-empty string/],
    ["unknown.json", '{"blockedEffect":["delete"]}', /unknown policy property: blockedEffect/i]
  ];

  for (const [name, contents, message] of cases) {
    const policy = join(directory, name);
    await writeFile(policy, contents);
    for (const args of [
      ["review", "fixtures/mixed-actions.json", "--policy", policy, "--format", "json"],
      ["record", "fixtures/mixed-actions.json", "--policy", policy, "--ledger", ledger]
    ]) {
      const error = await rejectsCli(...args);
      assert.equal(error.code, 1);
      assert.equal(error.stdout, "");
      assert.match(error.stderr, message);
    }
  }

  await assert.rejects(readFile(ledger, "utf8"), { code: "ENOENT" });
});

test("init-policy emits a policy accepted by review", async () => {
  const directory = await mkdtemp(join(tmpdir(), "consent-ledger-init-policy-"));
  const policy = join(directory, "policy.json");
  await runCli("init-policy", "--out", policy);

  const result = await runCli("review", "fixtures/mixed-actions.json", "--policy", policy, "--format", "json");
  assert.equal(JSON.parse(result.stdout).summary.total, 5);
});
