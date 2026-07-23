import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const run = promisify(execFile);

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
