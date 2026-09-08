# Release checklist

Use this checklist before cutting a public release for connector-consent-ledger-skill.

## Required checks

- Run `npm run release:check` from a clean checkout.
- Confirm the CI release-readiness job passes on the release PR.
- Keep self-hosted Actions Runner installations at v2.327.1 or later: the
  pinned checkout and setup-node v7 actions execute with the Node 24 runtime.
- Review the npm pack dry-run output for unexpected files or missing runtime assets.
- Exercise the CLI smoke path for `connector-consent-ledger` with the checked-in fixture.

## Review notes

- Keep fixture updates in the same PR as behavior changes.
- Call out limitations, required inputs, and operator follow-up in the PR body.
- Do not publish until the pack contents and smoke output match the README.
