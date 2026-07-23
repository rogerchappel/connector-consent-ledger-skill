# connector-consent-ledger-skill

Use this skill when an agent has a planned connector action and must prove what is read-only, draft-only, ask-first, approved, or blocked before touching live systems.

## Inputs

- A local JSON or simple YAML action plan.
- Optional local policy JSON created by `init-policy`.
- Optional approval notes for `record`.

## Boundaries

- No connector action is performed.
- No network request is made.
- Ledger writes happen only when `record --ledger <file>` is used.
- Credentialed writes, destructive operations, and external sends require explicit approval evidence.
- Approval evidence must be an exact policy marker (for example, `approval`) or
  use `marker:<reference>` (for example, `approval:ticket #42`). Free-form
  phrases and substring collisions do not grant approval.

## Workflow

```bash
connector-consent-ledger review plan.json --format markdown
connector-consent-ledger review plan.json --policy consent.policy.json --fail-on blocked
connector-consent-ledger record plan.json --ledger consent-ledger.jsonl --actor roger --note "approved in Slack"
connector-consent-ledger summarize consent-ledger.jsonl --format json
```

Validate with `npm test`, `npm run check`, `npm run build`, and `npm run smoke`.
