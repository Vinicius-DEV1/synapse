# Security Policy and Vulnerability Disclosure

Synapse uses cryptographic protections in selected vault, media, and sync flows. Coverage is not repository-wide: some local business records, metadata, and unmanaged assets are not encrypted at rest. See the [native encryption audit](./docs/security/native-encryption-audit.md) for verified behavior and current gaps. Do not assume a feature is secure solely because a module key exists.

## Supported Versions

This repository does not currently publish a maintained release-support matrix. Check the [changelog](./CHANGELOG.md) and the latest release information before reporting a version-specific issue.

## Reporting a Vulnerability

Please do not disclose a suspected vulnerability in public GitHub Issues, public discussions, or social media before the maintainers have reviewed it.

1. Use the repository's private [GitHub Security Advisory](https://github.com/Vinicius-DEV1/synapse/security/advisories/new) workflow when available.
2. If private advisories are unavailable, contact the project maintainer through the repository's GitHub profile and request a private reporting channel.

Include:

- A concise description of the vulnerability and its likely impact.
- Reproduction steps or a minimal proof of concept.
- The affected app target and version/commit, operating system, and relevant runtime.
- Any proposed mitigation, if available.
- Whether the issue requires an unlocked device, a configured Master Password, or network access.

Avoid attaching real user databases, passwords, tokens, or private media. Use sanitized test data.

## Response Expectations

The project does not promise fixed acknowledgement or remediation deadlines. The maintainer will confirm receipt, assess severity and reproducibility, and coordinate any public disclosure after a fix or mitigation is available.

## Out of Scope

The following are generally out of scope unless they expose a separate vulnerability in Synapse:

- Attacks requiring physical access to an already unlocked device or pre-existing host administrator/root compromise.
- Vulnerabilities in third-party browser extensions that modify the user's browser.
- Availability incidents in third-party providers without a security flaw in Synapse's integration.

## Security References

- [Native encryption coverage and open risks](./docs/security/native-encryption-audit.md)
- [Current documentation sources](./docs/documentation-status.md)
- [Contribution guide](./CONTRIBUTING.md)
