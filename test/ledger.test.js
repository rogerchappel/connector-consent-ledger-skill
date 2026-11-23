import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendLedger, summarizeLedger } from "../src/ledger.js";
import { reviewPlan } from "../src/review.js";

test("ledger preserves generated audit fields and classified state over action input", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "consent-ledger-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "audit.jsonl");
  const report = reviewPlan({
    name: "fixture-report",
    actions: [
      { id: "safe", connector: "mail", action: "inspect", sideEffect: "read-only" },
      { id: "unsafe", connector: "mail", action: "send", sideEffect: "external write" }
    ]
  });
  const entries = await appendLedger(file, report, { tenant: "test" });

  assert.equal(entries[0].source, "fixture-report");
  assert.equal(entries[0].state, "read-only");
  assert.equal(entries[1].state, "ask-first");
  for (const entry of entries) {
    assert.ok(Number.isFinite(Date.parse(entry.recordedAt)));
    assert.ok(Date.parse(entry.recordedAt) >= Date.parse(report.generatedAt));
  }
  assert.equal(JSON.parse((await readFile(file, "utf8")).split("\n")[0]).tenant, "test");

  const conflicting = report.actions.map((action) => ({
    ...action,
    recordedAt: "2000-01-01T00:00:00.000Z",
    source: "forged-source"
  }));
  const protectedEntries = await appendLedger(join(directory, "conflicts.jsonl"), { ...report, actions: conflicting });
  assert.deepEqual(protectedEntries.map(({ recordedAt, source, state }) => ({ recordedAt, source, state })), [
    { recordedAt: protectedEntries[0].recordedAt, source: "fixture-report", state: "read-only" },
    { recordedAt: protectedEntries[1].recordedAt, source: "fixture-report", state: "ask-first" }
  ]);

  const summary = await summarizeLedger(file);
  assert.equal(summary.total, 2);
  assert.deepEqual(summary.counts, { "read-only": 1, "ask-first": 1 });
});
