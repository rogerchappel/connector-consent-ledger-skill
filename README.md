# connector-consent-ledger-skill

A local-first CLI for reviewing connector action plans before an agent performs external side effects. It classifies each planned action as `read-only`, `draft`, `ask-first`, `approved`, or `blocked`, then emits Markdown or JSON that can be pasted into PRs, run logs, or approval threads.

## Quickstart

```bash
npm install
npm run smoke
node src/cli.js review fixtures/mixed-actions.json --format json
node src/cli.js init-policy --out consent.policy.json
node src/cli.js record fixtures/mixed-actions.json --ledger /tmp/consent-ledger.jsonl --actor roger --note "approval captured"
node src/cli.js summarize /tmp/consent-ledger.jsonl --format markdown
```

## Verification

Run the same checks used for release-readiness before publishing or opening a release PR:

```bash
npm run check
npm test
npm run build
npm run smoke
npm run release:check
npm pack --dry-run
```

## Safety Notes

The CLI never calls Slack, CRMs, browsers, project-management systems, or MCP servers. `review` is read-only. `record` only appends local JSONL entries to the path you provide.

### Action plan shapes

JSON and YAML plans may use an object with an `actions` array. JSON also accepts
a root action array or a single action object. Each action must be an object
containing at least one recognized action field such as `connector`, `action`,
`operation`, `target`, `sideEffect`, `effect`, `risk`, or `evidence`.

Blank files, `null` or scalar roots, unknown objects, non-array `actions`
properties, and malformed action entries are rejected before review or ledger
recording. An intentionally empty plan must therefore be explicit as
`{"actions":[]}` (or `[]` in JSON; `actions: []` in YAML is not supported by
the tiny YAML subset). Its report has `total: 0` and `highestState: "none"`; an
empty plan is never described as read-only.

### Approval evidence syntax

Ask-first actions become `approved` only when one evidence array entry is either
an exact policy marker or a marker followed by a colon and a reference:

```json
{
  "evidence": ["approval:ticket #42", "reviewed by release manager"]
}
```

Matching is case-insensitive and ignores surrounding whitespace. With the
default policy, `approval` and `ticket:CAB-19` are accepted; free-form text such
as `approval denied`, `disapproval recorded`, and `approval ticket #42` is not.
Custom `approvalEvidence` markers follow the same syntax.

Versions before this change used substring matching. Migrate existing plans by
changing positive free-form entries to `marker:<reference>` or an exact marker.
Keep denial and contextual notes as separate entries; they never grant approval.

### Side-effect matching

Policy effects match complete, case-insensitive tokens, not arbitrary
substrings. Non-alphanumeric separators can combine effects, so `read-only`,
`bulk-delete`, and `crm-write:contacts` retain their canonical classifications.
Unrelated or unknown values such as `bread` remain `ask-first`. When a value
contains multiple effects, precedence is `blocked`, `read-only`, `draft`, then
`ask-first`.

For `review` and `summarize`, `--format` accepts only `markdown` or `json`.
Omitting the flag uses the command default; providing the flag without a value
or with another value exits nonzero.

For `review`, `--fail-on` accepts exactly `read-only`, `draft`, `approved`,
`ask-first`, or `blocked` (lowercase). The command exits `2` when any reviewed
action has the selected state and otherwise exits `0`. A missing, unknown, or
case-mismatched value is a usage error that exits `1` before rendering a report.

### CLI arguments

Each command accepts exactly the positional arguments and options shown below:

```text
review <action-plan> [--policy <file>] [--format <markdown|json>] [--fail-on <state>]
record <action-plan> --ledger <file> [--policy <file>] [--actor <name>] [--note <text>]
summarize <ledger> [--format <markdown|json>]
init-policy [--out <file>]
```

Unknown options, extra positional arguments, and options without values are
treated as usage errors and exit nonzero. Markdown reports escape pipes and
line breaks inside table fields; JSON output retains the original field values.

## Limitations

YAML support is intentionally tiny and meant for simple fixture-style plans. Use JSON for complex inputs.

## Release Verification

Run the full release gate before opening a release-facing pull request:

```bash
npm run release:check
```

The release gate runs syntax checks, Node tests, fixture-backed CLI smoke, and
the package smoke script. The package smoke script fails if the npm tarball would
omit the CLI source, fixtures, release docs, security policy, contribution guide,
changelog, skill instructions, README, or license.

`npm run release:readiness` also verifies the public metadata, CLI bin target,
supporting docs, fixture presence, npm files allowlist, and CI workflow before
runtime checks execute.

## Development checks

Run the same local gates that CI runs before opening a PR:

```bash
npm run check --if-present
npm run build --if-present
npm test --if-present
npm run smoke --if-present
```

## Release notes

Before tagging a release, confirm the smoke fixture still represents the intended workflow and summarize any changed output, limitations, or operator steps in the PR.
