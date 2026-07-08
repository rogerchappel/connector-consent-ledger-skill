# Security Policy

## Supported Versions

The current `0.1.x` line receives security fixes while this package is in its
release-candidate phase.

## Reporting a Vulnerability

Please report suspected vulnerabilities privately through GitHub security
advisories for this repository. Include the command, fixture, and expected local
side effect when possible.

## Safety Model

`connector-consent-ledger-skill` is intended to run on local fixtures and local
ledger files. It does not contact connector APIs, approve actions, or write to
external accounts. Treat its output as review evidence, not as authorization to
perform an external action.
