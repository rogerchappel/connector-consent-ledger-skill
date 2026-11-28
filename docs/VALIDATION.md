# Action-plan validation diagnostics

The CLI validates the input shape before consent-policy classification. A parse or
schema error exits with status `1` and prints a message to stderr; it does not
produce a review report or append a ledger entry. Policy findings are valid
review results: they appear in the report as a state and reason (including
`ask-first` or `blocked`) and do not indicate malformed input.

## Parse failures

Malformed JSON is reported with its source and, when available, a line and
column. For example, an input file `plan.json` containing `{"actions": [}`
produces a diagnostic beginning like:

```text
plan.json: invalid JSON at line 1, column 14: ...
```

YAML is intentionally limited to simple fixture-style plans. An unsupported
shape is reported as `plan.yaml: Unsupported YAML shape in plan.yaml: ...`.
Use JSON for nested or otherwise complex plans.

## Schema failures

Schema messages identify the invalid field or action index. Examples:

| Malformed input | Diagnostic |
| --- | --- |
| `null` as the plan root | `input: plan root must be an object or array` |
| `{ "actions": {} }` | `input: actions must be an array` |
| `{ "actions": [null] }` | `input: actions[0] must be an object` |
| `{ "actions": [{}] }` | `input: actions[0] has no recognized action fields` |
| `{ "actions": [{ "connector": "crm", "sideEffect": "read", "effect": "write" }] }` | `input: actions[0] has conflicting side-effect aliases: sideEffect, effect` |

The source label is the input filename for CLI commands; library callers may
supply their own label. Action indexes are zero-based. Correct the indicated
field/shape and rerun `review` before attempting `record`.

## Valid input with policy findings

This input is valid even though its effect needs confirmation:

```json
{"actions": [{"connector":"crm","action":"update","sideEffect":"crm-write"}]}
```

`review` returns an action in state `ask-first` with an explanatory reason. A
credential export can instead be a valid `blocked` policy finding. Neither is a
parse/schema failure; use the report to resolve the consent requirement rather
than changing the input shape. `review --fail-on <state>` can optionally return
status `2` when that valid state occurs.
