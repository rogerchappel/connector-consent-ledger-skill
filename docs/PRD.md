# PRD: connector-consent-ledger-skill

Status: ready
Decision: build now
Created: 2026-07-04

## Pitch

`connector-consent-ledger-skill` creates a local, reviewable consent ledger for planned connector actions so agents can separate read-only inspection, draft changes, external sends, destructive operations, and credentialed writes before they touch live systems.

## Why It Matters

Agents increasingly route work through Slack, CRMs, project-management tools, browsers, MCP servers, and custom connectors. The riskiest step is often not planning the action, but proving what was approved, what stayed in dry-run, and what must be re-confirmed before execution. A local ledger makes that boundary boring and auditable.

## Qualification

### Pub Test

"Pipe a connector action plan into `connector-consent-ledger review` and get a consent checklist plus JSON ledger entries that distinguish draft, ask-first, approved, and blocked actions."

### Source / Inspiration

Inspired by OpenClaw connector routing, MCP tool permission review, dry-run action planning, and Roger's repeated requirement that external writes receive explicit approval. This is an original local-first audit workflow, not an extraction from a private connector.

## V1 Scope

- TypeScript CLI package.
- Commands: `review`, `record`, `summarize`, and `init-policy`.
- Accept JSON/YAML action plans with connector name, action, target, risk, side effect, and evidence.
- Classify actions as `read-only`, `draft`, `ask-first`, `approved`, or `blocked` using local rules.
- Emit Markdown and JSON consent reports for PRs, run logs, or human approval.
- Append optional local JSONL ledger entries only when explicitly requested.
- Fixture-backed tests for messaging, CRM, filesystem, browser, and dry-run-only plans.
- Include `SKILL.md` covering approval requirements and external-action boundaries.

## Out of Scope

- Performing connector actions.
- Sending messages, updating CRMs, or writing to project-management systems.
- Storing secrets or OAuth tokens.
- Hosted audit storage.

## CLI Sketch

```bash
connector-consent-ledger review action-plan.json --format markdown
connector-consent-ledger review action-plan.yaml --policy consent.policy.json --fail-on blocked
connector-consent-ledger record action-plan.json --ledger consent-ledger.jsonl
connector-consent-ledger summarize consent-ledger.jsonl --format json
```

## Verification

Run `npm test`, `npm run check`, `npm run build`, `npm run smoke`, policy fixture tests, and a JSONL append smoke in a temporary directory.

## Agent Prompt

Build `connector-consent-ledger-skill` as a local-first consent and approval-boundary ledger for connector action plans. Default to dry-run review, never perform external writes, and make every approval state evidence-linked.
