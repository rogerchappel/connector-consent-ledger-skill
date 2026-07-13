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
