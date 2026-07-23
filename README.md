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
