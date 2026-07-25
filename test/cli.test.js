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
