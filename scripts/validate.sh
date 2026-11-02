#!/usr/bin/env bash
set -euo pipefail
npm test
npm run check
npm run build
npm run smoke
npm run package:smoke
tmp_dir="${TMPDIR:-/tmp}"
ledger="$(mktemp "${tmp_dir%/}/connector-consent-ledger-smoke.XXXXXX")"
trap 'rm -f -- "$ledger"' EXIT
node src/cli.js record fixtures/mixed-actions.json --ledger "$ledger" --actor smoke --note validate >/dev/null
node src/cli.js summarize "$ledger" --format json >/dev/null
