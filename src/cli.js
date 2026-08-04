#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { readPlan } from "./parse.js";
import { reviewPlan } from "./review.js";
import { renderReport, renderJson } from "./render.js";
import { appendLedger, summarizeLedger } from "./ledger.js";
import { initialPolicyJson } from "./policy.js";

const usage = {
  review: "review <action-plan> [--policy <file>] [--format <markdown|json>] [--fail-on <state>]",
  record: "record <action-plan> --ledger <file> [--policy <file>] [--actor <name>] [--note <text>]",
  summarize: "summarize <ledger> [--format <markdown|json>]",
  "init-policy": "init-policy [--out <file>]"
};
const consentStates = ["read-only", "draft", "approved", "ask-first", "blocked"];

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
  const { positionals: [file], options } = parseCommand(
    "review",
    args,
    1,
    ["policy", "format", "fail-on"]
  );
  validateFailOn(options["fail-on"]);
  const policy = options.policy ? JSON.parse(await readFile(options.policy, "utf8")) : {};
  const report = reviewPlan(await readPlan(file), policy);
  process.stdout.write(renderReport(report, outputFormat(options, "markdown")));
  failOn(report, options["fail-on"]);
}

function validateFailOn(state) {
  if (state !== undefined && !consentStates.includes(state)) {
    throw usageError("review", `--fail-on requires one of: ${consentStates.join(", ")}`);
  }
}

async function record(args) {
  const { positionals: [file], options } = parseCommand(
    "record",
    args,
    1,
    ["ledger", "policy", "actor", "note"]
  );
  if (!options.ledger) throw usageError("record", "record requires --ledger <file>");
  const report = reviewPlan(await readPlan(file), options.policy ? JSON.parse(await readFile(options.policy, "utf8")) : {});
  const entries = await appendLedger(options.ledger, report, { actor: options.actor || "unknown", note: options.note || "" });
  process.stdout.write(renderJson({ ledger: options.ledger, appended: entries.length, entries }));
}

async function summarize(args) {
  const { positionals: [file], options } = parseCommand("summarize", args, 1, ["format"]);
  const summary = await summarizeLedger(file);
  const format = outputFormat(options, "json");
  process.stdout.write(format === "markdown" ? ledgerMarkdown(summary) : JSON.stringify(summary, null, 2) + "\n");
}

async function initPolicy(args) {
  const { options } = parseCommand("init-policy", args, 0, ["out"]);
  if (options.out) await writeFile(options.out, initialPolicyJson());
  else process.stdout.write(initialPolicyJson());
}

function parseCommand(command, args, positionalCount, allowedOptions) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (!allowedOptions.includes(key)) {
      throw usageError(command, `Unknown option: ${arg}`);
    }
    if (Object.hasOwn(options, key)) {
      throw usageError(command, `Option repeated: ${arg}`);
    }
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      const formatHint = key === "format" ? "; --format requires one of: markdown, json" : "";
      throw usageError(command, `Option ${arg} requires a value${formatHint}`);
    }
    options[key] = args[++index];
  }
  if (positionals.length < positionalCount) {
    throw usageError(command, `${command} requires ${command === "summarize" ? "a ledger file" : "an action plan file"}`);
  }
  if (positionals.length > positionalCount) {
    throw usageError(command, `Unexpected argument: ${positionals[positionalCount]}`);
  }
  return { positionals, options };
}

function usageError(command, message) {
  return new Error(`${message}\nUsage: connector-consent-ledger ${usage[command]}`);
}

function outputFormat(options, fallback) {
  const format = options.format ?? fallback;
  if (format !== "markdown" && format !== "json") {
    throw new Error("--format requires one of: markdown, json");
  }
  return format;
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
