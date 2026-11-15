# 14 — Home (Dashboard)

> **Status**: ✅ Complete | **Complexity**: 🟢 Low | **Priority**: P3
>
> Home dashboard aggregates real-time metrics through prepared SQLite queries (`getHomeDashboardData`), including greeting header, localized date, agenda section, recent and pinned notes, 4 quick actions bar (Nova Página, Calendário, Flashcards com badge de revisões pendentes, Arquivos), live weather and clock widget (`HomeWeatherWidget.qml`), and categorized in-app guide (`HomeHelpDialog.qml`).

## React Reference: `apps/web-react/src/components/home/` (5 files)
## Qt Existing: `qml/home/` — `HomeView.qml`, `HomeGreetingHeader.qml`, `HomeAgendaSection.qml`, `HomeNotesSection.qml`, `HomeWeatherWidget.qml`, `HomeHelpDialog.qml` + `home_controller.cpp`

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| Greeting header (time-of-day) | `HomeView.tsx` | ✅ Done (`HomeGreetingHeader.qml`) |
| Agenda section (today/tomorrow events) | `ui/HomeAgendaSection.tsx` | ✅ Done (`HomeAgendaSection.qml`) |
| Notes section (recent/pinned pages) | `ui/HomePagesSection.tsx` | ✅ Done (`HomeNotesSection.qml`) |
| Quick actions bar | `ui/HomeQuickActions.tsx` | ✅ Done (`HomeGreetingHeader.qml`) |
| Live weather & clock widget | — | ✅ Done (`HomeWeatherWidget.qml`) |
| Help dialog | — | ✅ Done (`HomeHelpDialog.qml`) |

---

# 15 — Settings

> **Status**: ✅ Complete | **Complexity**: 🟡 Medium | **Priority**: P2
>
> Native settings features diagnostics and database maintenance (export backup, vacuum/optimize, path inspection), volumetry grid auditing 11 entity types, master password modal (setup, change, remove), auto-lock configuration, theme accent palette selection, AI API key pool & Gemini models tab (`SettingsAiTab.qml`), editor typography and preferences tab (`SettingsEditorTab.qml`), and zero-knowledge cloud sync tab (`SettingsSyncTab.qml`).

## React Reference: `apps/web-react/src/components/settings/` (18 files)
## Qt Existing: `qml/settings/` — `SettingsView.qml`, `SettingsHeaderSection.qml`, `SettingsSecurityThemeSection.qml`, `SettingsVolumetryGrid.qml`, `SettingsAiTab.qml`, `SettingsEditorTab.qml`, `SettingsSyncTab.qml`, `MasterPasswordModal.qml`, `SettingsHelpDialog.qml` + `settings_controller.cpp`

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| General diagnostics & backup | `tabs/GeneralTab.tsx` | ✅ Done (`SettingsHeaderSection.qml`) |
| Volumetry audit grid | — | ✅ Done (`SettingsVolumetryGrid.qml`) |
| Security & auto-lock | `tabs/SecurityTab.tsx` | ✅ Done (`SettingsSecurityThemeSection.qml`) |
| Master password lifecycle | `tabs/security/MasterPasswordSection.tsx` | ✅ Done (`MasterPasswordModal.qml`) |
| AI tab (API keys pool, models) | `tabs/AiTab.tsx` | ✅ Done (`SettingsAiTab.qml`) |
| Editor tab (typography, autosave) | `tabs/EditorTab.tsx` | ✅ Done (`SettingsEditorTab.qml`) |
| Cloud sync tab (zero-knowledge) | `tabs/SharingTab.tsx` | ✅ Done (`SettingsSyncTab.qml`) |
| Help dialog | — | ✅ Done (`SettingsHelpDialog.qml`) |

---

# 16 — Trash

> **Status**: ✅ Complete | **Complexity**: 🟢 Low | **Priority**: P3
>
> Multi-entity soft-delete aggregation and restoration across 12 entity types backed by prepared SQLite queries, type filter bar (`TrashFilterBar.qml`), live title search, one-click restoration, individual permanent purge, empty trash confirmation modal (`EmptyTrashModal.qml`), and large-dataset pagination controls with cursor navigation (`TrashItemsList.qml`).

## React Reference: `apps/web-react/src/components/trash/` (6 files)
## Qt Existing: `qml/trash/` — `TrashView.qml`, `TrashHeaderSection.qml`, `TrashFilterBar.qml`, `TrashItemsList.qml`, `EmptyTrashModal.qml`, `TrashHelpDialog.qml` + `trash_controller.cpp`

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| Trash item list | `TrashView.tsx` | ✅ Done (`TrashItemsList.qml`) |
| Filter tabs (by type: pages, files, etc.) | `ui/TrashFilterTabs.tsx` | ✅ Done (`TrashFilterBar.qml`) |
| Empty trash confirmation modal | `ui/TrashEmptyConfirmModal.tsx` | ✅ Done (`EmptyTrashModal.qml`) |
| Large dataset pagination controls | — | ✅ Done (`TrashItemsList.qml`) |
| Restore items | — | ✅ Done |
| Permanent purge | — | ✅ Done |
| Help dialog | — | ✅ Done (`TrashHelpDialog.qml`) |

---

# 17 — Notifications

> **Status**: ✅ Complete | **Complexity**: 🟢 Low | **Priority**: P3
>
> Native notification center features unread badge tracking, prepared SQL queries for marking read, deleting, clearing all, filter tabs (Todas, Não lidas, Eventos, Alarmes), relative time formatting, contextual note opening, calendar task completion, snooze (+15 min), audio chime feedback, and categorized in-app guide.

## React Reference: `apps/web-react/src/components/notifications/` (3 files)
## Qt Existing: `qml/notifications/` — `NotificationCenter.qml`, `NotificationHelpDialog.qml` + `notifications_controller.cpp`

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| Notification center panel | `NotificationCenterModal.tsx` | ✅ Done (`NotificationCenter.qml`) |
| Unread count badge | `NotificationBell.tsx` | ✅ Done |
| Filter tabs (unread/event/alarm) | — | ✅ Done (`NotificationCenter.qml`) |
| Audio chime feedback | — | ✅ Done (`NotificationCenter.qml`) |
| Direct page/event navigation | — | ✅ Done |
| Clear all & mark read | — | ✅ Done |
| Help dialog | — | ✅ Done (`NotificationHelpDialog.qml`) |
