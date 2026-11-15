# 06 — Calendar

> **Status**: ✅ Complete | **Complexity**: 🟡 Medium | **Priority**: P2
>
> Full calendar view with month grid navigation, day details modal (`CalendarDayModal.qml`), task feed list (`CalendarTaskFeed.qml`), event creation and full editing with delete action, event reminders selector (`CalendarEventFormReminders.qml`), and status toggling (completed / pending).

---

## React Reference
- **Components**: `apps/web-react/src/components/calendar/` (11 files)
- **Hooks**: `hooks/useEventForm.ts`

## Qt Existing & Implemented
- **QML**: `apps/desktop-qt/qml/calendar/`
  - Core Views: `CalendarView.qml`, `CalendarHeader.qml`, `CalendarMonthGrid.qml`, `CalendarAgendaList.qml`, `CalendarHelpDialog.qml`
  - Modals & Feeds: `CalendarDayModal.qml`, `CalendarTaskFeed.qml`, `CreateEventModal.qml`, `CalendarEventFormReminders.qml`
- **Controller**: `apps/desktop-qt/src/controllers/calendar/calendar_controller.cpp`

---

## Feature Parity Table

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| Calendar month grid | `CalendarGrid.tsx` | ✅ Done |
| Calendar view with header & filters | `CalendarView.tsx` | ✅ Done |
| Agenda list | `ui/CalendarAgendaList.tsx` | ✅ Done |
| Create event modal | `EventModal.tsx` | ✅ Done |
| Help dialog | — | ✅ Done |
| **Day detail modal (click on day)** | `DayModal.tsx` | ✅ Done (`CalendarDayModal.qml`) |
| **Task feed (agenda with tasks)** | `TaskFeed.tsx` | ✅ Done (`CalendarTaskFeed.qml`) |
| **Event form reminders selector** | `ui/EventFormReminders.tsx` | ✅ Done (`CalendarEventFormReminders.qml`) |
| **Event editing (full update & delete)** | `EventModal.tsx` | ✅ Done (`CreateEventModal.qml`) |
| **Status toggle (pending / completed)** | — | ✅ Done |

---

## Implementation Details

1. **Day Detail Modal**:
   - `CalendarDayModal.qml`: Displays all events/tasks scheduled for a clicked day, allowing quick completion toggles, direct event editing, and adding new events pre-filling that date.

2. **Task Feed**:
   - `CalendarTaskFeed.qml`: Chronological task feed with completion checkboxes, type pills, and edit actions.

3. **Event Reminders & Full Editing**:
   - `CalendarEventFormReminders.qml`: Configures notification reminders (at event time, 5m, 15m, 30m, 1h, 1d before).
   - `CreateEventModal.qml`: Full editing mode with pre-filled fields, form validation, and safe delete action.
