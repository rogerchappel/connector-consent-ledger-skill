#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { readPlan } from "./parse.js";
import { reviewPlan } from "./review.js";
import { renderReport, renderJson } from "./render.js";
import { appendLedger, summarizeLedger } from "./ledger.js";
import { initialPolicyJson } from "./policy.js";

const [command, ...args] = process.argv.slice(2);

try {
  if (!command || command === "--help") help();
  else if (command === "review") await review(args);
  else if (command === "record") await record(args);
  else if (command === "summarize") await summarize(args);
  else if (command === "init-policy") await initPolicy(args);
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

async function review(args) {
  const file = args[0];
  if (!file) throw new Error("review requires an action plan file");
  const options = parseOptions(args.slice(1));
  const policy = options.policy ? JSON.parse(await readFile(options.policy, "utf8")) : {};
  const report = reviewPlan(await readPlan(file), policy);
  process.stdout.write(renderReport(report, options.format || "markdown"));
  failOn(report, options["fail-on"]);
}

async function record(args) {
  const file = args[0];
  if (!file) throw new Error("record requires an action plan file");
  const options = parseOptions(args.slice(1));
  if (!options.ledger) throw new Error("record requires --ledger <file>");
  const report = reviewPlan(await readPlan(file), options.policy ? JSON.parse(await readFile(options.policy, "utf8")) : {});
  const entries = await appendLedger(options.ledger, report, { actor: options.actor || "unknown", note: options.note || "" });
  process.stdout.write(renderJson({ ledger: options.ledger, appended: entries.length, entries }));
}

async function summarize(args) {
  const file = args[0];
  if (!file) throw new Error("summarize requires a ledger file");
  const options = parseOptions(args.slice(1));
  const summary = await summarizeLedger(file);
  process.stdout.write(options.format === "markdown" ? ledgerMarkdown(summary) : JSON.stringify(summary, null, 2) + "\n");
}

async function initPolicy(args) {
  const options = parseOptions(args);
  if (options.out) await writeFile(options.out, initialPolicyJson());
  else process.stdout.write(initialPolicyJson());
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    options[key] = next && !next.startsWith("--") ? args[++index] : true;
  }
  return options;
}

function failOn(report, state) {
  if (state && report.actions.some((action) => action.state === state)) process.exitCode = 2;
}

function ledgerMarkdown(summary) {
  return [`# Consent Ledger Summary`, "", `File: ${summary.file}`, `Total entries: ${summary.total}`, "", ...Object.entries(summary.counts).map(([state, count]) => `- ${state}: ${count}`)].join("\n") + "\n";
}

function help() {
  process.stdout.write(`connector-consent-ledger <command>\n\nCommands: review, record, summarize, init-policy\n`);
}
