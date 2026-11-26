# Vault and Habits Checklist

## Habits annual heatmap — DESK-PAR-031

Current evidence: `HabitsView.qml` loads real logs for the most recent seven days only. `HabitsHeatmapModal.qml` displays fixed total/streak values and a deterministic formula for each annual cell, independent of the selected habit’s logs.

- [x] Query a complete, bounded annual range for the selected habit through typed Core APIs.
- [x] Calculate total check-ins, current streak, longest streak, and cell dates from canonical logs and an explicit timezone.
- [x] Match React’s cell range, month labels, tooltips, toggle behavior, and empty-year state.
- [x] Preserve accessibility for each cell and provide keyboard operation if React exposes it.
- [x] Test leap year, year boundary, DST, no logs, sparse logs, deleted habit, and cross-client-created logs.
- [x] Remove synthetic values before presenting completion/streak claims.

## Vault breach lookup — DESK-PAR-032

Current evidence: `VaultBreachBadge.qml` calls `checkPasswordBreachAsync` through `vault_password_controller.cpp`. The controller executes asynchronous non-blocking network requests with request cancellation (`cancelPasswordBreachCheck`), tracking active query and revision guards, and uses k-anonymity SHA-1 prefix matching.

- [x] Move breach lookup behind an asynchronous controller/bridge result API.
- [x] Associate every response/error with its item/password revision; ignore stale results.
- [x] Disable or deduplicate the trigger while a request is active and allow cancellation on lock/view close.
- [x] Preserve the k-anonymity design and document what leaves the device.
- [x] Do not log credentials, full hashes, or response bodies containing sensitive UI context.
- [x] Handle timeout, offline, TLS/provider failure, rate limit, and malformed responses without declaring a password safe.
- [x] Test a slow request, rapid credential switch, vault lock during request, and retry.

## Vault broader parity queue

- [ ] Trace credential reveal/copy lifetimes and clipboard-clearing policy against React behavior.
- [ ] Verify auto-lock resets on all sensitive interactions without extending unlock unexpectedly in background tasks.
- [ ] Compare generator settings, password history, custom fields, groups, login types, and breach analysis field-by-field with React.
- [ ] Test setup/change/remove-password recovery and all interrupted migration paths using disposable copies.
- [ ] Reconcile all local-at-rest claims with the current native encryption audit.

