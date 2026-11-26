# Focus and Notifications Checklist

This checklist expands DESK-PAR-023, DESK-PAR-024, and DESK-PAR-025. It is implementation planning only; no design choice should be treated as approved merely because it appears here.

## Confirmed current behavior

- `FocusLofiView.qml` owns its active Pomodoro state in QML and records a session only when it completes or is cancelled.
- `FocusSettingsModal.qml` owns sound, alarm type, and daily-goal values locally.
- Focus alarm records can be created, listed, toggled, and deleted, but the inspected Qt paths have no clock/scheduler that opens `AlarmTriggerModal`.
- The notification center’s 15-minute snooze uses generic `addNotification` with a future `scheduled_for`. The Qt bridge does not expose Core’s typed snooze/delivery operations.
- `FocusSettingsModal` supplies a retention range, but `FocusLofiView` deletes every session regardless of that value.

## Active Focus session contract

- [ ] Define whether an active session is local-only, cross-device, or both.
- [ ] Define canonical fields: ID, started-at instant, target duration, elapsed/remaining, pause state, tag, description, current sound, and completion state.
- [ ] Store active state outside QML and calculate elapsed time from an absolute clock rather than counting only UI ticks.
- [ ] Define behavior for app close, crash, suspend, resume, system sleep, daylight-saving changes, and manual clock change.
- [ ] Recover a session once on restart without duplicate completed-session records.
- [ ] Define cancel vs reset vs abandon semantics and whether each creates history.
- [ ] Verify 1-second UI updates do not trigger expensive full-screen reloads.

## Focus preferences and sound

- [x] Inventory React Focus preferences and map each Qt supported/unsupported value.
- [x] Persist daily goal, sound enabled/type, volume, selected Lo-fi state, and any timer defaults through an approved settings contract.
- [x] Do not store secret/provider data in QML properties.
- [x] Implement actual completion/pause/alarm sound playback with volume/mute and device error handling.
- [x] Restore preferences on restart and test per-profile/account behavior if profiles are introduced.

## Alarm scheduling and delivery

- [ ] Decide foreground-only versus background/OS alarm guarantees per supported desktop OS.
- [ ] Expose typed Core/bridge operations for due alarms, scheduled notifications, delivery acknowledgement, and snooze.
- [ ] Schedule alarms using absolute time and selected repeat days; calculate next occurrence with a documented timezone policy.
- [ ] Route a due alarm to audio, visual modal, notification-center record, and optional OS notification without duplicate delivery.
- [ ] Persist dismissal/snooze and ensure restart does not re-fire dismissed alarms.
- [ ] Implement device/audio-unavailable, permission, and app-not-running fallback UX.
- [ ] Test one-time, repeating, disabled, midnight, DST, timezone-change, and multiple-simultaneous alarms.

## Notification lifecycle

- [ ] Replace UI-level generic scheduled notification creation with typed snooze operation.
- [ ] Expose due notifications or a delivery worker that marks them delivered exactly once.
- [ ] Integrate Calendar reminder creation/update/delete with notification scheduling when calendar recurrence lands.
- [ ] Support mark read, delete, clear, snooze, complete linked event, and open linked note with atomic state updates.
- [ ] Test pending scheduled entries are invisible until due and appear exactly once after delivery.
- [ ] Test app restart, offline state, duplicate sync events, deleted linked pages/events, and failed OS notification delivery.

## Focus history retention

- [x] Move date-range filtering into a typed Core operation; do not iterate/deletion-filter in QML.
- [x] Define local timezone and inclusion boundaries for Today and Last 7 Days.
- [x] Show exact count and period in confirmation before deletion.
- [x] Preserve expected soft-delete/recovery policy.
- [x] Test no records, one boundary record, timezone boundary, all-history, and failed delete behavior.

## Acceptance record

- [ ] Unit/domain tests cover scheduling, due delivery, snooze, and retention boundaries.
- [ ] Qt controller/bridge tests cover errors and idempotency.
- [ ] Manual test covers restart during active timer and a due alarm.
- [ ] Manual test covers notification snooze reappearing after 15 minutes.
- [ ] Screenshot/keyboard acceptance covers modal focus, Escape, and focus restoration.
- [ ] Update DESK-PAR-023/024/025 and the matrix with commands and date.
