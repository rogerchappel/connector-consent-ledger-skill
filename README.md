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
`operation`, `target`, `sideEffect`, `effect`, `risk`, `state`, or `evidence`.

When present, `id`, `connector`, `action`, `operation`, `target`, and the
side-effect aliases `sideEffect`, `side_effect`, `effect`, and `risk` must each
be a non-empty string. When an action supplies more than one alias, their
values must agree after case, surrounding whitespace, and non-alphanumeric
separator normalization; contradictory aliases are rejected with the indexed
field names before review output or a ledger append. `evidence` must be either one non-empty string or an
array of non-empty strings; an empty array is allowed when no evidence is
attached. Validation errors identify the exact field, such as
`actions[2].target` or `actions[0].evidence[1]`. Numbers, booleans, objects,
arrays in scalar fields, and blank strings are rejected before report output
or any ledger append.

YAML evidence arrays use an indented sequence and retain their source order:

```yaml
actions:
  - connector: crm
    action: update
    sideEffect: crm-write
    evidence:
      - context:change-window
      - approval:ticket-42
```

Each nested entry must be a non-empty string. Invalid entries report their
exact index, such as `actions[0].evidence[1]`.

An action may set `"state": "blocked"` to explicitly prevent it regardless of
its side-effect classification. This exact lowercase value is the only
supported input-state override; the report uses a blocked-specific reason and
includes the action in its blocked count and highest state. Other strings,
different casing, blank values, and non-string values are rejected instead of
being silently ignored:

```json
{
  "actions": [
    { "connector": "crm", "action": "inspect", "sideEffect": "read", "state": "blocked" }
  ]
}
```

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

### Custom policy shape

A policy file must contain one JSON object. It may override only these generated
properties, and every supplied value must be an array whose entries are
non-empty strings:

- `blockedEffects`
- `askFirstEffects`
- `draftEffects`
- `readOnlyEffects`
- `approvalEvidence`
- `states`

Effect arrays replace the corresponding defaults used for classification, and
`approvalEvidence` replaces the default approval markers. `states` records the
fixed output-state vocabulary emitted by `init-policy`; changing it does not add
new classification states. Surrounding whitespace is removed from every custom
policy entry before matching; effect and approval-marker matching remains
case-insensitive, and effect entries retain the boundary-aware matching described
above. Empty arrays are allowed when a category should have no matches. Unknown
properties, non-object policy roots, non-array overrides, and blank or non-string
array entries are rejected before review output or a ledger append.

Run `node src/cli.js init-policy --out consent.policy.json` to generate a valid
policy containing every supported property.

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

YAML support is intentionally tiny and meant for simple fixture-style plans. It
accepts top-level scalar properties and one top-level list of flat mappings.
Scalar values may be unquoted or wrapped in matching single or double quotes;
the surrounding quotes are removed, but YAML escape sequences are not decoded.
A `#` starts an inline comment only when it is outside quotes and preceded by
whitespace. Hash characters inside either kind of quoted scalar are preserved.
Blank lines and comment-only lines are ignored. Use JSON for complex inputs,
nested structures, flow collections, block scalars, anchors, or tags.

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
