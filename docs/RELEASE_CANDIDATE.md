# Release Candidate

## Classification

ship

## Verification

- `npm test`
- `npm run check`
- `npm run build`
- `npm run smoke`
- `npm run package:smoke`
- `npm run release:check`
- `node src/cli.js record fixtures/mixed-actions.json --ledger /tmp/consent-ledger.jsonl`

## Notes

The first public build is local-only, fixture-backed, and safe for agent approval-boundary rehearsals.
Action identifiers, connector/action/operation/target fields, and side-effect aliases are validated as non-empty strings. Evidence accepts a non-empty string or an array of non-empty strings. Malformed plans fail with an exact `actions[index].field` diagnostic before review output or ledger mutation.
