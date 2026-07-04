# Orchestration

1. Collect an action plan from a connector router, agent handoff, or dry-run tool.
2. Run `connector-consent-ledger review <plan>` before any external side effect.
3. Share the Markdown report with the human reviewer or include the JSON in a run log.
4. Only use `record` after the approval decision is known and local persistence is desired.
5. Re-run review whenever the plan, target, side effect, or evidence changes.

The tool never sends messages, updates CRMs, writes tickets, or calls live connectors.
