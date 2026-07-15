#!/usr/bin/env bash
set -euo pipefail
npm test
npm run check
npm run build
npm run smoke
npm run package:smoke
ledger="${TMPDIR:-/tmp}/connector-consent-ledger-smoke.jsonl"
rm -f "$ledger"
node src/cli.js record fixtures/mixed-actions.json --ledger "$ledger" --actor smoke --note validate >/dev/null
node src/cli.js summarize "$ledger" --format json >/dev/null
