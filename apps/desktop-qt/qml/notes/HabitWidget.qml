import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: habitWidgetRoot
    implicitWidth: Math.min(parent ? parent.width : 600, contentCol.implicitWidth + 8)
    implicitHeight: contentCol.implicitHeight + 12
    color: "transparent"

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string pageTitle: ""
    property string targetHabitId: attrs["data-habit-id"] || attrs["habit-id"] || ""
    property string resolvedDate: ""
    property var habitsList: []
    property var completedMap: ({})

    signal statsRequested(string habitId)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function todayIso() {
        var d = new Date()
        var m = d.getMonth() + 1
        var day = d.getDate()
        return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day)
    }

    function refreshHabits() {
        if (typeof dataController === "undefined" || !dataController) return
        var today = todayIso()
        if (typeof dataController.resolveDateFromPageTitle === "function") {
            resolvedDate = dataController.resolveDateFromPageTitle(pageTitle, today)
        } else {
            resolvedDate = today
        }
        var all = typeof dataController.getHabits === "function" ? (dataController.getHabits() || []) : []
        if (targetHabitId.length > 0 && targetHabitId !== "all") {
            habitsList = all.filter(function(h) { return h.id === targetHabitId })
        } else {
            habitsList = all
        }
        var logs = typeof dataController.getHabitLogs === "function" ? (dataController.getHabitLogs(resolvedDate) || []) : []
        var nextMap = ({})
        for (var i = 0; i < logs.length; i++) {
            if (logs[i].completed || logs[i].status === "completed") {
                nextMap[logs[i].habit_id] = true
            }
        }
        completedMap = nextMap
    }

    function toggleHabit(habitId) {
        if (typeof dataController === "undefined" || !dataController || !habitId) return
        if (dataController.toggleHabitCheckin(habitId, resolvedDate)) {
            refreshHabits()
        }
    }

    Component.onCompleted: refreshHabits()
    onPageTitleChanged: refreshHabits()
    onBlockDataChanged: refreshHabits()

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        anchors.margins: 8
        spacing: 6

        Text {
            visible: habitWidgetRoot.habitsList.length === 0
            text: qsTr("Nenhum hábito encontrado.")
            color: "#71717a"
            font.pixelSize: 12
        }

        Flow {
            Layout.fillWidth: true
            spacing: 8

            Repeater {
                model: habitWidgetRoot.habitsList
                delegate: Rectangle {
                    id: hRow
                    required property var modelData
                    readonly property bool done: Boolean(habitWidgetRoot.completedMap[modelData.id])
                    readonly property int streakCount: Number(hRow.modelData.current_streak || 0)
                    height: 30
                    width: Math.min(habitWidgetRoot.width - 16, chipRow.implicitWidth + 18)
                    radius: 8
                    color: done ? "#1a10b981" : (chipHover.hovered ? "#27272a" : "#e618181b")
                    border.color: done ? "#4d10b981" : (chipHover.hovered ? "#33ffffff" : "#14ffffff")

                    HoverHandler { id: chipHover }

                    RowLayout {
                        id: chipRow
                        anchors.centerIn: parent
                        spacing: 7

                        Rectangle {
                            Layout.preferredWidth: 16
                            Layout.preferredHeight: 16
                            radius: 4
                            color: hRow.done ? "#10b981" : "#08ffffff"
                            border.color: hRow.done ? "transparent" : "#40ffffff"
                            AppIcon {
                                anchors.centerIn: parent
                                visible: hRow.done
                                name: "check"
                                color: "#09090b"
                                width: 11
                                height: 11
                            }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: habitWidgetRoot.toggleHabit(hRow.modelData.id)
                            }
                        }

                        Text {
                            text: hRow.modelData.title || hRow.modelData.name || qsTr("Hábito")
                            color: hRow.done ? "#a7f3d0" : "#e4e4e7"
                            font.pixelSize: 12
                            font.weight: Font.Medium
                            elide: Text.ElideRight
                        }

                        Rectangle {
                            height: 18
                            width: streakTxt.implicitWidth + 10
                            radius: 9
                            color: hRow.done ? "#33fbbf24" : "#1427272a"
                            border.color: hRow.done ? "#4dfbbf24" : "#0fffffff"
                            Text {
                                id: streakTxt
                                anchors.centerIn: parent
                                text: "🔥 " + hRow.streakCount
                                color: (hRow.done || hRow.streakCount > 0) ? "#fbbf24" : "#71717a"
                                font.pixelSize: 10
                                font.family: "monospace"
                                font.bold: true
                            }
                        }

                        ToolButton {
                            Layout.preferredWidth: 20
                            Layout.preferredHeight: 20
                            focusPolicy: Qt.NoFocus
                            onClicked: habitWidgetRoot.statsRequested(hRow.modelData.id)
                            background: Rectangle { radius: 4; color: parent.hovered ? "#1affffff" : "transparent" }
                            contentItem: AppIcon {
                                anchors.centerIn: parent
                                name: "analytics"
                                color: "#a1a1aa"
                                width: 11
                                height: 11
                            }
                        }
                    }
                }
            }

            ToolButton {
                Layout.preferredWidth: 24
                Layout.preferredHeight: 24
                visible: hoverHandler.hovered
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Remover widget")
                onClicked: habitWidgetRoot.removeRequested()
                background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: "trash"
                    color: parent.hovered ? "#fda4af" : "#71717a"
                    width: 12
                    height: 12
                }
            }
        }
    }
}
