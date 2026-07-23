# Changelog

## [Unreleased]

- Add release-readiness checks for package metadata, pack contents, and CI verification.
- Require explicit `marker` or `marker:<reference>` approval evidence instead of
  unsafe substring matches, including for recorded ledger entries.
## 0.1.0

- Initial release candidate for local connector consent review.
- Includes fixture-backed review, policy initialization, local ledger recording,
  and summary commands.
- Packages the CLI source, skill instructions, release-candidate docs, and sample
  fixtures needed to verify behavior offline.
