# Android UI Modularization Plan — 2026-11-20

## Goal

Reduce Android Compose screen files that exceed the repository's 300-line target by extracting cohesive dialogs, models, and view components. Preserve route behavior, callbacks, copy, colors, spacing, and state transitions.

## Scope

| Module | Current file | Planned extraction |
| --- | --- | --- |
| Finance | `FinanceScreen.kt` | Transaction model and entry dialog |
| Calendar | `CalendarScreen.kt` | Event model and event editor sheet |
| Habits | `HabitsScreen.kt` | Habit model and creation dialog |
| Library | `LibraryScreen.kt` | Book model and creation dialog |
| Culture | `CultureScreen.kt` | Media model, details sheet, and add-media sheet |
| Diagrams | `DiagramsScreen.kt` | Diagram/drawing models and creation sheet |
| Video | `VideoPlayerScreen.kt` | Playback controls, keeping the encrypted player and key lifecycle in the route owner |
| Questions | `ZenQuizScreen.kt` | Curated question bank, answer option, and completion screen |

## Completion Checklist

- [x] Extract each module's cohesive UI and data types into feature-owned files.
- [x] Keep each touched Kotlin file below 300 lines.
- [x] Preserve existing labels, visuals, callbacks, filters, and state updates. The quiz also now shows its already-tracked completion state, score, and restart action.
- [x] Build the Android debug package after the extractions.
- [x] Install and smoke-check the affected module routes in the emulator, including quiz scoring/restart and the video empty state.
- [x] Record remaining persistence and native-bridge gaps separately from UI extraction in the [Android audit](./potential-bug-audit-android-2026-11-19.md).

## Verification

- `apps/mobile-android/gradlew -p apps/mobile-android :app:assembleDebug` — passed with Gradle 8.9 and JDK 17.
- Final debug APK: `apps/mobile-android/app/build/outputs/apk/debug/app-debug.apk`; SHA-256 `6c917d09b7298d73c691684764c473c532f4bc5cf4af0e7fce085fb97ded6bc6`.
- Emulator smoke checks on the final APK passed for Calendar, Finance, Habits, Library, Culture, Diagrams, Quiz, and Video. The quiz rendered the 3/3 result and reset to question 1 on restart.
- Focus now starts at `0 ciclos concluídos hoje (0 min)`; its completion total uses the selected session duration.
- These UI checks do not cover Android persistence, Firebase sync, or encrypted video playback.
