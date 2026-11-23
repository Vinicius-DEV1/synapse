import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: heatmapModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property var habit: null
    property int totalCheckinsCount: 0
    property int currentStreakDays: 0
    property int longestStreakDays: 0
    property var logDateSet: ({})
    property var dateList: []

    function reloadData() {
        if (!habit || !habit.id) return
        var now = new Date()
        var todayIso = Qt.formatDate(now, "yyyy-MM-dd")
        var stats = dataController.getHabitStats(habit.id, todayIso)
        totalCheckinsCount = stats.totalCompleted || 0
        currentStreakDays = stats.currentStreak || 0
        longestStreakDays = stats.bestStreak || 0

        // 52 weeks = 364 days ending today
        var start = new Date(now.getTime() - 363 * 86400000)
        var startIso = Qt.formatDate(start, "yyyy-MM-dd")
        var logs = dataController.getHabitLogsRange(startIso, todayIso)
        var set = {}
        if (logs && logs.length > 0) {
            for (var i = 0; i < logs.length; i++) {
                var l = logs[i]
                if (l.habit_id === habit.id) {
                    set[l.date] = true
                }
            }
        }
        logDateSet = set

        // Precompute dates for 52 columns x 7 rows
        var days = []
        for (var w = 0; w < 52; w++) {
            var weekDays = []
            for (var d = 0; d < 7; d++) {
                var dayOffset = w * 7 + d
                var dayDate = new Date(start.getTime() + dayOffset * 86400000)
                var dIso = Qt.formatDate(dayDate, "yyyy-MM-dd")
                weekDays.push({
                    date: dIso,
                    completed: (set[dIso] === true)
                })
            }
            days.push(weekDays)
        }
        dateList = days
    }

    onHabitChanged: reloadData()
    onVisibleChanged: if (visible) reloadData()

    signal closeRequested()

    Shortcut {
        sequence: "Escape"
        enabled: heatmapModalRoot.visible
        onActivated: heatmapModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: heatmapModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 860)
        height: Math.min(parent.height - 48, 480)
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    width: 36
                    height: 36
                    radius: 8
                    color: heatmapModalRoot.habit && heatmapModalRoot.habit.color ? heatmapModalRoot.habit.color + "26" : "#2610b981"
                    Text {
                        anchors.centerIn: parent
                        text: heatmapModalRoot.habit ? (heatmapModalRoot.habit.icon || "⭐") : "⭐"
                        font.pixelSize: 18
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: heatmapModalRoot.habit ? (heatmapModalRoot.habit.title || "Hábito") : "Hábito"
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.bold: true
                    }
                    Text {
                        text: "Histórico anual de consistência e heatmap de check-ins"
                        color: "#94a1b2"
                        font.pixelSize: 12
                    }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: heatmapModalRoot.closeRequested()
                }
            }

            // Quick Stats Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    Layout.fillWidth: true
                    height: 60
                    radius: 8
                    color: "#11101a"
                    border.color: "#2e2b44"
                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 2
                        Text { text: "Total de Check-ins"; color: "#94a1b2"; font.pixelSize: 10; Layout.alignment: Qt.AlignHCenter }
                        Text { text: "" + heatmapModalRoot.totalCheckinsCount; color: "#10b981"; font.pixelSize: 16; font.bold: true; Layout.alignment: Qt.AlignHCenter }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    height: 60
                    radius: 8
                    color: "#11101a"
                    border.color: "#2e2b44"
                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 2
                        Text { text: "Sequência Atual"; color: "#94a1b2"; font.pixelSize: 10; Layout.alignment: Qt.AlignHCenter }
                        Text { text: heatmapModalRoot.currentStreakDays + " dias"; color: "#f59e0b"; font.pixelSize: 16; font.bold: true; Layout.alignment: Qt.AlignHCenter }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    height: 60
                    radius: 8
                    color: "#11101a"
                    border.color: "#2e2b44"
                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 2
                        Text { text: "Maior Sequência"; color: "#94a1b2"; font.pixelSize: 10; Layout.alignment: Qt.AlignHCenter }
                        Text { text: heatmapModalRoot.longestStreakDays + " dias"; color: "#8b5cf6"; font.pixelSize: 16; font.bold: true; Layout.alignment: Qt.AlignHCenter }
                    }
                }
            }

            // Annual Heatmap Grid (52 columns x 7 rows)
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 10
                color: "#11101a"
                border.color: "#2e2b44"

                ScrollView {
                    anchors.fill: parent
                    anchors.margins: 14
                    clip: true

                    RowLayout {
                        spacing: 3

                        Repeater {
                            model: heatmapModalRoot.dateList.length > 0 ? heatmapModalRoot.dateList.length : 52

                            ColumnLayout {
                                id: weekCol
                                property int weekIndex: index
                                property var weekDays: (heatmapModalRoot.dateList.length > weekIndex) ? heatmapModalRoot.dateList[weekIndex] : []
                                spacing: 3

                                Repeater {
                                    model: 7 // 7 days per week

                                    Rectangle {
                                        id: dayCell
                                        width: 11
                                        height: 11
                                        radius: 2

                                        property var dayInfo: (weekCol.weekDays.length > index) ? weekCol.weekDays[index] : null
                                        property bool isCompleted: dayInfo ? dayInfo.completed : false
                                        property string dayDateStr: dayInfo ? dayInfo.date : ""

                                        color: isCompleted ? (heatmapModalRoot.habit && heatmapModalRoot.habit.color ? heatmapModalRoot.habit.color : "#10b981") : "#1f1d2e"

                                        ToolTip.visible: cellMouse.containsMouse
                                        ToolTip.text: (dayDateStr ? dayDateStr : ("Dia " + (weekCol.weekIndex * 7 + index + 1))) + ": " + (isCompleted ? "Concluído" : "Pendente")

                                        MouseArea {
                                            id: cellMouse
                                            anchors.fill: parent
                                            hoverEnabled: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Legend Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Item { Layout.fillWidth: true }

                Text { text: "Menos"; color: "#94a1b2"; font.pixelSize: 11 }
                Rectangle { width: 10; height: 10; radius: 2; color: "#1f1d2e" }
                Rectangle { width: 10; height: 10; radius: 2; color: "#065f46" }
                Rectangle { width: 10; height: 10; radius: 2; color: "#10b981" }
                Rectangle { width: 10; height: 10; radius: 2; color: "#34d399" }
                Text { text: "Mais"; color: "#94a1b2"; font.pixelSize: 11 }
            }
        }
    }
}
