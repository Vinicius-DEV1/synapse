# 11 — Focus (Pomodoro Timer)

> **Status**: ✅ Complete | **Complexity**: 🟡 Medium | **Priority**: P3
>
> 100% feature and visual parity achieved across Pomodoro timer canvas, active fullscreen countdown, setup modal, settings modal, cancel accountability modal, delete confirmation modal, comprehensive statistics view, alarms subsystem with setup/list/trigger, global ambient Lo-Fi player, Lo-Fi library manager, and procedural ambient sound mixer.

---

## React Reference
- **Components**: `apps/web-react/src/components/focus/` (20 files)
- **Store**: `apps/web-react/src/store/FocusContext.tsx`, `store/focus/` (4 files)

## Qt Existing
- **QML**: `FocusLofiView.qml`, `PomodoroTimerCanvas.qml`, `FocusActiveTimer.qml`, `FocusHistorySection.qml`, `FocusSetupModal.qml`, `FocusSettingsModal.qml`, `FocusCancelModal.qml`, `FocusDeleteModal.qml`, `FocusStatsView.qml`, `AlarmsList.qml`, `AlarmSetupModal.qml`, `AlarmTriggerModal.qml`, `LofiView.qml`, `LofiSoundMixerModal.qml`, `GlobalLofiPlayer.qml`, `FocusHelpDialog.qml`, `FocusCelebrationModal.qml`, `FocusCustomTimeModal.qml`
- **Controller**: `focus_controller.cpp`

---

## Feature Parity Table

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| Focus session list | `FocusApp.tsx` | ✅ Done |
| Timer display | — | ✅ Done |
| Help dialog | `FocusHelpModal.tsx` | ✅ Done |
| **Active timer view (full-screen countdown)** | `ActiveTimer.tsx` | ✅ Done (`FocusActiveTimer.qml`) |
| **Focus dashboard (overview)** | `Dashboard.tsx` | ✅ Done (`FocusLofiView.qml`) |
| **Focus setup modal (configure timer)** | `SetupModal.tsx` | ✅ Done (`FocusSetupModal.qml`) |
| **Focus settings modal (preferences)** | `SettingsModal.tsx` | ✅ Done (`FocusSettingsModal.qml`) |
| **Session success modal** | `SuccessModal.tsx` | ✅ Done (`FocusCelebrationModal.qml`) |
| **Cancel session modal** | `CancelModal.tsx` | ✅ Done (`FocusCancelModal.qml`) |
| **Delete session modal** | `FocusDeleteModal.tsx` | ✅ Done (`FocusDeleteModal.qml`) |
| **Focus stats view** | `FocusStatsView.tsx` | ✅ Done (`FocusStatsView.qml`) |
| **Alarm setup modal** | `AlarmSetupModal.tsx` | ✅ Done (`AlarmSetupModal.qml`) |
| **Alarm list** | `AlarmsList.tsx` | ✅ Done (`AlarmsList.qml`) |
| **Alarm trigger modal** | `AlarmTriggerModal.tsx` | ✅ Done (`AlarmTriggerModal.qml`) |
| **Lo-fi music player (global)** | `GlobalLofiPlayer.tsx` | ✅ Done (`GlobalLofiPlayer.qml`) |
| **Lo-fi view (music manager)** | `LofiView.tsx` | ✅ Done (`LofiView.qml`) |
| **Sortable lo-fi item** | `lofi/SortableLofiItem.tsx` | ✅ Done (`LofiView.qml`) |
| **Lo-fi view actions** | `hooks/useLofiViewActions.ts` | ✅ Done (`focus_controller.cpp`) |
| **Lo-fi bulk actions** | `hooks/useLofiBulkActions.ts` | ✅ Done (`focus_controller.cpp`) |
| **Global focus overlays** | `GlobalFocusOverlays.tsx` | ✅ Done (`GlobalLofiPlayer.qml`) |
| **Focus sound service** | `store/focus/focus-sound.ts` | ✅ Done (`LofiSoundMixerModal.qml`) |
| **Alarm scheduler** | `store/focus/useAlarmScheduler.ts` | ✅ Done (`focus_controller.cpp`) |
| **Focus timer hook** | `store/focus/useFocusTimer.ts` | ✅ Done (`FocusLofiView.qml`) |
| **Lo-fi audio hook** | `store/focus/useLofiAudio.ts` | ✅ Done (`GlobalLofiPlayer.qml`) |
| **Focus context (global state)** | `store/FocusContext.tsx` | ✅ Done (`FocusLofiView.qml`) |

---

## Implementation Specs

### Active Timer View
- **React**: `ActiveTimer.tsx`
- **Create**: `qml/focus/FocusActiveTimer.qml`
- **Behavior**: Full-screen immersive countdown timer. Large circular progress ring with remaining time in center. Shows current session type (Focus, Short Break, Long Break). Pause/Resume and Cancel buttons. Minimal distractions. Optional ambient sound playing.
- **Approach**: QML `Canvas` or `ShaderEffect` for circular progress. `QTimer` for countdown in controller.
- **Acceptance**: Timer counts down accurately, progress ring animates smoothly, pause/resume works, session type shown.

### Focus Dashboard
- **React**: `Dashboard.tsx`
- **Create**: `qml/focus/FocusDashboard.qml`
- **Behavior**: Overview showing: today's focus sessions, total focus time today, streak (consecutive days with focus), weekly/monthly chart of focus hours, session history list.
- **Acceptance**: Dashboard shows accurate today/week/month data, session history is scrollable.

### Setup Modal
- **React**: `SetupModal.tsx`
- **Create**: `qml/focus/FocusSetupModal.qml`
- **Behavior**: Configure and start a focus session. Settings: focus duration (default 25 min), short break (5 min), long break (15 min), number of rounds (4), auto-start breaks, auto-start focus. Start button begins the timer.
- **Acceptance**: User configures durations, starts session, timer begins with configured values.

### Settings Modal
- **React**: `SettingsModal.tsx`
- **Create**: `qml/focus/FocusSettingsModal.qml`
- **Behavior**: Persistent preferences: default durations, notification sound, auto-start behavior, daily focus goal (hours), break reminder style.
- **Acceptance**: Settings persist across sessions, applied to new focus sessions.

### Lo-fi Music Player
- **React**: `GlobalLofiPlayer.tsx`, `LofiView.tsx`, `lofi/SortableLofiItem.tsx`, `store/focus/useLofiAudio.ts`
- **Create**: `qml/focus/LofiPlayer.qml`, `qml/focus/LofiView.qml`, `qml/focus/LofiTrackItem.qml`
- **Behavior**: Background ambient music player for focus sessions. Global player bar at bottom during focus. Lo-fi view to manage tracks: add from local files, reorder (drag & drop), play/pause individual tracks, playlist loop. Volume control, shuffle toggle.
- **Approach**: Qt Multimedia `MediaPlayer` for audio playback. `Playlist` model for track management.
- **Controller**: `Q_INVOKABLE void addLofiTrack(const QString &path)`, `Q_INVOKABLE void removeLofiTrack(int index)`, `Q_INVOKABLE void reorderLofiTracks(...)`
- **Acceptance**: Player plays audio during focus, global bar visible, tracks manageable, volume works.

### Alarm System
- **React**: `AlarmSetupModal.tsx`, `AlarmsList.tsx`, `AlarmTriggerModal.tsx`, `store/focus/useAlarmScheduler.ts`
- **Create**: `qml/focus/AlarmSetupModal.qml`, `qml/focus/AlarmsList.qml`, `qml/focus/AlarmTriggerModal.qml`
- **Behavior**: Set alarms for study reminders. Setup: time, label, repeat (daily, weekdays, weekends, custom days), sound. List view shows all alarms with toggle switch. Trigger modal: full-screen alarm with dismiss and snooze buttons.
- **Controller**: `Q_INVOKABLE void createAlarm(...)`, schedule via `QTimer` or system notifications
- **Acceptance**: Alarms fire at set time, trigger modal shows, snooze works, repeat patterns work.

### Focus Stats View
- **React**: `FocusStatsView.tsx`
- **Create**: `qml/focus/FocusStatsView.qml`
- **Behavior**: Detailed focus statistics: daily/weekly/monthly charts, average session length, total sessions, completion rate (vs cancelled), most productive hours, streak calendar.
- **Acceptance**: Stats are accurate, charts render, period selector works.

### Success & Cancel Modals
- **Create**: `qml/focus/FocusSuccessModal.qml`, `qml/focus/FocusCancelModal.qml`
- **Behavior**: Success: shows congratulations with session summary (duration, session count). Optional confetti animation. Cancel: confirmation before ending session early, shows how much time remains.
- **Acceptance**: Success shows after completing all rounds, cancel asks for confirmation.

---

## Dependencies
- Qt Multimedia for lo-fi audio playback
- System notifications for alarms
- Focus context needs to be accessible globally (singleton controller)

## Estimated New Files
- ~14 new QML files
- ~2 controller extensions
- ~2 test files
