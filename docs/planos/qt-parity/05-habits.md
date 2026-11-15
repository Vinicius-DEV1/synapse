# 05 — Habits

> **Status**: ✅ Complete | **Complexity**: 🟡 Medium | **Priority**: P2
>
> Full SQLite-backed habit tracking with 7-day rolling matrix check-ins, habit scorecards with streak analytics, annual contribution heatmap modal (`HabitsHeatmapModal.qml`), multi-habit selection modal (`HabitsSelectModal.qml`), target days per week, and in-app guide.

---

## React Reference
- **Components**: `apps/web-react/src/components/habits/` (6 files)
- **Hooks**: `hooks/useHabitHeatmapData.ts`

## Qt Existing & Implemented
- **QML**: `apps/desktop-qt/qml/habits/`
  - Core Views: `HabitsView.qml`, `HabitsHeaderSection.qml`, `HabitsMatrixList.qml`, `CreateHabitModal.qml`, `HabitsHelpDialog.qml`
  - Analytics & Visualizations: `HabitsScoreCards.qml`, `HabitsHeatmapModal.qml`
  - Selection Modal: `HabitsSelectModal.qml`
- **Controller**: `apps/desktop-qt/src/controllers/habits/habits_controller.cpp`

---

## Feature Parity Table

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| Habits list view | `HabitsView.tsx` | ✅ Done |
| Create/edit habit modal | `CreateHabitModal.tsx` | ✅ Done |
| Weekly target configuration (3-7 days) | — | ✅ Done |
| 7-day check-in matrix toggle | `ui/HabitMatrix.tsx` | ✅ Done |
| Help dialog | `HabitsHelpModal.tsx` | ✅ Done |
| **Monthly/Annual heatmap modal** | `HabitHeatmapModal.tsx` | ✅ Done (`HabitsHeatmapModal.qml`) |
| **Heatmap grid visualization** | `ui/HabitHeatmapGrid.tsx` | ✅ Done (`HabitsHeatmapModal.qml`) |
| **Habit scorecards (streak analytics)** | `ui/HabitScorecards.tsx` | ✅ Done (`HabitsScoreCards.qml`) |
| **Habit selection modal** | `HabitSelectModal.tsx` | ✅ Done (`HabitsSelectModal.qml`) |

---

## Implementation Details

1. **Streak Analytics & Scorecards**:
   - `HabitsScoreCards.qml`: Displays 4 KPI cards (Active Habits, Completed Today, Weekly Completion Rate %, Consistency / Active Streak) updating in real time.

2. **Annual Heatmap Modal**:
   - `HabitsHeatmapModal.qml`: Displays GitHub-style contribution calendar heatmap (52 weeks × 7 days) with color-intensity grading, total check-in count, current streak, and longest recorded streak.

3. **Multi-Habit Selector**:
   - `HabitsSelectModal.qml`: Multi-selection dialog with search filtering for widgets or custom habit groupings.
