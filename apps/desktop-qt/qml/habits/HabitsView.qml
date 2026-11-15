import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: habitsRoot
    color: "#0f0e17" // bg-dark-bg

    property var habits: []
    property var last7Days: []
    property var logMap: ({})
    property bool isHabitsHelpOpen: false
    property bool isHeatmapOpen: false
    property var selectedHabitForHeatmap: null

    function computeDays() {
        var days = []
        var today = new Date()
        var dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
        for (var i = 6; i >= 0; i--) {
            var d = new Date(today.getTime() - i * 86400000)
            var iso = Qt.formatDate(d, "yyyy-MM-dd")
            var name = dayNames[d.getDay()]
            days.push({ date: iso, name: name, isToday: (i === 0) })
        }
        last7Days = days
    }

    function refreshHabits() {
        computeDays()
        habits = dataController.getHabits()
        if (last7Days.length > 0) {
            var startDate = last7Days[0].date
            var endDate = last7Days[last7Days.length - 1].date
            var logs = dataController.getHabitLogsRange(startDate, endDate)
            var map = {}
            for (var i = 0; i < logs.length; i++) {
                var key = logs[i].habit_id + "_" + logs[i].date
                map[key] = true
            }
            logMap = map
        }
    }

    Component.onCompleted: {
        refreshHabits()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        // Header and Actions
        HabitsHeaderSection {
            habitCount: habitsRoot.habits.length
            onCreateHabitRequested: createHabitModal.openModal(null)
            onHelpRequested: habitsRoot.isHabitsHelpOpen = true
        }

        // Streak Analytics & Scorecards Strip
        HabitsScoreCards {
            habits: habitsRoot.habits
            last7Days: habitsRoot.last7Days
            logMap: habitsRoot.logMap
        }

        // Habits Matrix List
        HabitsMatrixList {
            habits: habitsRoot.habits
            last7Days: habitsRoot.last7Days
            logMap: habitsRoot.logMap

            onToggleCheckin: function(habitId, dateStr) {
                dataController.toggleHabitCheckin(habitId, dateStr)
                habitsRoot.refreshHabits()
            }
            onHeatmapRequested: function(habit) {
                habitsRoot.selectedHabitForHeatmap = habit
                habitsRoot.isHeatmapOpen = true
            }
            onEditHabitRequested: function(habit) {
                createHabitModal.openModal(habit)
            }
            onDeleteHabitRequested: function(habitId) {
                dataController.deleteHabit(habitId)
                habitsRoot.refreshHabits()
            }
        }
    }

    // Modal: Criar ou Editar Hábito
    CreateHabitModal {
        id: createHabitModal
        onHabitSubmitted: function(title, color, icon, targetDays) {
            dataController.createHabit(title, color, icon, targetDays)
            habitsRoot.refreshHabits()
        }
        onHabitUpdated: function(habitId, title, color, icon, targetDays) {
            dataController.updateHabit(habitId, title, color, icon, targetDays)
            habitsRoot.refreshHabits()
        }
    }

    // Modal: Heatmap Anual do Hábito
    HabitsHeatmapModal {
        visible: habitsRoot.isHeatmapOpen
        habit: habitsRoot.selectedHabitForHeatmap
        onCloseRequested: habitsRoot.isHeatmapOpen = false
    }

    // Modal: Guia de Hábitos
    HabitsHelpDialog {
        isOpen: habitsRoot.isHabitsHelpOpen
        onClosed: habitsRoot.isHabitsHelpOpen = false
    }
}
