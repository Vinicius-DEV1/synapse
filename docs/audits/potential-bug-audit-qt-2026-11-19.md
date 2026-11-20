# Potential Bug Audit — Native Qt — 2026-11-19

## Scope

This focused review traced the workspace switcher's cloud-account action through its QML modal and application signal wiring. It did not audit all Qt screens or certify cloud-account support.

## Finding and Resolution

### QT-02 — The cloud-account placeholder reported a successful connection without doing any work

- **Severity:** High
- **Category:** Authentication, misleading status, data integrity
- **Locations:** `apps/desktop-qt/qml/workspace/WorkspaceSwitcher.qml`, `apps/desktop-qt/qml/auth/AccountEvolutionModal.qml`, `apps/desktop-qt/qml/layout/GlobalModalsHost.qml`
- **Root cause:** The modal collected an email and password, emitted an email-only signal with no consumer, then displayed “account connected” and “initial sync scheduled” immediately. The Qt client had no Firebase authentication or sync implementation behind that action.
- **Resolution:** The form and false-success signal were removed. The modal now states that cloud authentication and synchronization are unavailable in this Qt client, confirms that no local data or credentials were changed, and offers only a close action. The existing local vault credential remains in place until a verified account/key migration is implemented.
- **Parity:** The modal retains the existing native dark surface and entry point; its content now reflects the actual runtime capability.

## Verification

- `cmake --build apps/desktop-qt/build --target synapse-desktop-tests -j4` — passed.
- `QT_QPA_PLATFORM=offscreen ctest --test-dir apps/desktop-qt/build -R '^native-priority-modules$' --output-on-failure` — passed, including a regression that checks the unavailable state, absence of the fake success signal, and dismissal action.
- `git diff --check` — passed.

## Remaining Work

- [ ] Implement and verify Firebase authentication, cloud key loading, safe local key rewrap, and native sync for Qt before removing the local credential flow.
- [ ] Verify the cloud module-key envelope format with the Web KDF separately from the local Rust keychain KDF before any cross-client key operation.
- [ ] Run installed-app acceptance after the Qt cloud integration exists.

This finding does not certify other Qt modules or mean that the Qt client is migrated to the cloud account.
