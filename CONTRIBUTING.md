# Contributing

Thanks for helping improve `connector-consent-ledger-skill`.

## Development

Use the local release gate before opening a pull request:

```bash
npm run release:check
```

Keep fixtures synthetic and small. Do not add real customer, workspace, account,
or token data to examples, tests, or documentation.

## Pull Requests

- Keep changes focused on one behavior or release-surface improvement.
- Include the exact commands you ran and any relevant fixture output.
- Update README, docs, and package smoke expectations when the published surface
  changes.
