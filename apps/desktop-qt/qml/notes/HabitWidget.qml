import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: habitWidgetRoot
    implicitWidth: Math.min(parent ? parent.width : 600, contentFlow.implicitWidth + 4)
    implicitHeight: contentFlow.implicitHeight + 4

    property var blockData: ({})
    property var controller: null
    property var attrs: blockData.attrs || ({})
    property string pageTitle: ""
    property string targetHabitId: attrs["data-habit-id"] || attrs["habit-id"] || attrs["habitId"] || ""
    property string fallbackTitle: attrs["data-title"] || attrs["title"] || qsTr("Hábito")
    property int fallbackStreak: parseInt(attrs["data-streak"] || attrs["streak"] || "0", 10) || 0
    property string explicitDate: attrs["data-target-date"] || attrs["targetDate"] || ""
    property string resolvedDate: ""
    property var habitsList: []
    property var completedMap: ({})
    property bool isNotFound: false

    signal statsRequested(string habitId)
    signal removeRequested()

    HoverHandler { id: rootHover }

    function todayIso() {
        var d = new Date()
        var m = d.getMonth() + 1
        var day = d.getDate()
        return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day)
    }

    function refreshHabits() {
        var today = todayIso()
        var c = habitWidgetRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
        if (explicitDate.length > 0) {
            resolvedDate = explicitDate
        } else if (c && typeof c.resolveDateFromPageTitle === "function") {
            resolvedDate = c.resolveDateFromPageTitle(pageTitle, today)
        } else {
            resolvedDate = today
        }

        var all = (c && typeof c.getHabits === "function") ? (c.getHabits() || []) : []

        if (targetHabitId.length > 0 && targetHabitId !== "all") {
            var matched = all.filter(function(h) { return h.id === targetHabitId })
            if (matched.length > 0) {
                isNotFound = false
                habitsList = matched
            } else if (all.length > 0) {
                isNotFound = true
                habitsList = [{
                    id: targetHabitId,
                    title: fallbackTitle,
                    current_streak: fallbackStreak,
                    isDeleted: true
                }]
            } else {
                isNotFound = false
                habitsList = [{
                    id: targetHabitId,
                    title: fallbackTitle,
                    current_streak: fallbackStreak,
                    isDeleted: false
                }]
            }
        } else if (all.length > 0) {
            isNotFound = false
            habitsList = all
        } else {
            isNotFound = false
            habitsList = [{
                id: targetHabitId || "preview",
                title: fallbackTitle,
                current_streak: fallbackStreak,
                isDeleted: false
            }]
        }

        var logs = (c && typeof c.getHabitLogs === "function") ? (c.getHabitLogs(resolvedDate) || []) : []
        var nextMap = ({})
        for (var i = 0; i < logs.length; i++) {
            if (logs[i].completed || logs[i].status === "completed") {
                nextMap[logs[i].habit_id] = true
            }
        }
        completedMap = nextMap
    }

    function toggleHabit(habitId) {
        var c = habitWidgetRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
        if (!c || !habitId || isNotFound) return
        if (c.toggleHabitCheckin(habitId, resolvedDate)) {
            refreshHabits()
        }
    }

    Component.onCompleted: refreshHabits()
    onPageTitleChanged: refreshHabits()
    onBlockDataChanged: refreshHabits()

    Flow {
        id: contentFlow
        width: parent.width
        spacing: 6

        Repeater {
            model: habitWidgetRoot.habitsList
            delegate: Rectangle {
                id: hChip
                required property var modelData
                readonly property bool isDeleted: Boolean(modelData.isDeleted)
                readonly property bool done: !isDeleted && Boolean(habitWidgetRoot.completedMap[modelData.id])
                readonly property int streakCount: Number(modelData.current_streak !== undefined ? modelData.current_streak : habitWidgetRoot.fallbackStreak)

                height: 30
                width: Math.min(habitWidgetRoot.width, chipRow.implicitWidth + 20)
                radius: 8
                color: isDeleted
                    ? "#1af43f5e"
                    : (done ? "#1a10b981" : (chipHover.hovered ? "#22212c" : "#e618181b"))
                border.color: isDeleted
                    ? "#33f43f5e"
                    : (done ? (chipHover.hovered ? "#8010b981" : "#4d10b981")
                            : (chipHover.hovered ? "#33ffffff" : "#14ffffff"))
                border.width: 1
                Behavior on color { ColorAnimation { duration: 150 } }
                Behavior on border.color { ColorAnimation { duration: 150 } }

                HoverHandler { id: chipHover }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        if (!hChip.isDeleted && hChip.modelData.id) {
                            habitWidgetRoot.statsRequested(hChip.modelData.id)
                        }
                    }
                }

                RowLayout {
                    id: chipRow
                    anchors.centerIn: parent
                    spacing: 8

                    // Deleted state icon or Custom 16x16 Checkbox
                    AppIcon {
                        visible: hChip.isDeleted
                        name: "alert"
                        color: "#fda4af"
                        width: 13
                        height: 13
                    }

                    Rectangle {
                        visible: !hChip.isDeleted
                        Layout.preferredWidth: 16
                        Layout.preferredHeight: 16
                        radius: 4
                        color: hChip.done ? "#10b981" : "#08ffffff"
                        border.color: hChip.done ? "#10b981" : (cbHover.hovered ? "#34d399" : "#40ffffff")
                        border.width: 1
                        Behavior on color { ColorAnimation { duration: 150 } }
                        Behavior on border.color { ColorAnimation { duration: 150 } }

                        HoverHandler { id: cbHover }

                        AppIcon {
                            anchors.centerIn: parent
                            visible: hChip.done
                            name: "check"
                            color: "#09090b"
                            strokeWidth: 2.6
                            width: 11
                            height: 11
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: function(mouse) {
                                mouse.accepted = true
                                habitWidgetRoot.toggleHabit(hChip.modelData.id)
                            }
                        }
                    }

                    // Habit title
                    Text {
                        text: hChip.modelData.title || hChip.modelData.name || qsTr("Hábito")
                        color: hChip.isDeleted ? "#fda4af" : (hChip.done ? "#a7f3d0" : "#e4e4e7")
                        font.pixelSize: 12
                        font.weight: Font.Medium
                        font.italic: hChip.isDeleted
                        font.strikeout: hChip.isDeleted
                        elide: Text.ElideRight
                        Layout.maximumWidth: 180
                    }

                    Text {
                        visible: hChip.isDeleted
                        text: qsTr("(Excluído)")
                        color: "#bf9f1239"
                        font.pixelSize: 10
                    }

                    // Streak Pill with vector Flame icon
                    Rectangle {
                        visible: !hChip.isDeleted
                        Layout.preferredHeight: 18
                        Layout.preferredWidth: streakRow.implicitWidth + 12
                        radius: 9
                        color: hChip.done
                            ? "#33fbbf24"
                            : (hChip.streakCount > 0 ? "#27272a" : "#0affffff")
                        border.color: hChip.done
                            ? "#4dfbbf24"
                            : (hChip.streakCount > 0 ? "#10ffffff" : "transparent")
                        border.width: 1

                        RowLayout {
                            id: streakRow
                            anchors.centerIn: parent
                            spacing: 3

                            AppIcon {
                                name: "flame"
                                color: (hChip.done || hChip.streakCount > 0) ? "#fbbf24" : "#71717a"
                                width: 10
                                height: 10
                            }

                            Text {
                                text: String(hChip.streakCount)
                                color: hChip.done ? "#fcd34d" : (hChip.streakCount > 0 ? "#a1a1aa" : "#71717a")
                                font.pixelSize: 10
                                font.family: "monospace"
                                font.weight: Font.DemiBold
                            }
                        }
                    }

                    // Activity Heatmap icon indicator
                    AppIcon {
                        visible: !hChip.isDeleted
                        name: "activity"
                        color: chipHover.hovered ? "#e4e4e7" : "#71717a"
                        opacity: chipHover.hovered ? 1.0 : 0.45
                        Behavior on opacity { NumberAnimation { duration: 150 } }
                        width: 12
                        height: 12
                    }
                }
            }
        }

        ToolButton {
            Layout.preferredWidth: 26
            Layout.preferredHeight: 26
            visible: rootHover.hovered
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Remover widget")
            onClicked: habitWidgetRoot.removeRequested()
            background: Rectangle { radius: 6; color: parent.hovered ? "#1af43f5e" : "transparent" }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "trash"
                color: parent.hovered ? "#fb7185" : "#71717a"
                width: 12
                height: 12
            }
        }
    }
}
