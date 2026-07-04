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

## Safety Notes

The CLI never calls Slack, CRMs, browsers, project-management systems, or MCP servers. `review` is read-only. `record` only appends local JSONL entries to the path you provide.

## Limitations

YAML support is intentionally tiny and meant for simple fixture-style plans. Use JSON for complex inputs.
