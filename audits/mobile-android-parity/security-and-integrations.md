# Security and Integrations

See the [audit dashboard](./README.md) for status and sequencing. Android local persistence is not evidence of account-scoped synchronization or encryption at rest. Keep credential and protected-content writes behind verified shared contracts.

## Phase 3 — Identity, Encryption, and Cloud Parity

- [ ] Select and document the Android account/authentication integration.
- [ ] Implement versioned root-key/module-key setup, unlock, auto-lock, memory cleanup, and legacy migration before storing vault credentials or syncing encrypted entities.
- [ ] Add account-scoped encrypted Firebase sync through the current conflict resolver and chunk protocol.
- [ ] Add retryable, observable sync status and conflict handling.
- [ ] Audit every Android entity's local at-rest encryption and remote encryption; do not infer coverage from key availability.
- [ ] Keep existing local-only data until encrypted cloud readback and recovery are verified.
