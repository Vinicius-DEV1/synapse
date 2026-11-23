import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: habitWidgetRoot
    Layout.fillWidth: true
    implicitHeight: contentCol.implicitHeight + 22
    radius: 12
    color: "#161524"
    border.color: hoverHandler.hovered ? "#3310b981" : "#14ffffff"
    border.width: 1

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
        anchors.margins: 12
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            AppIcon { name: "habits"; color: "#34d399"; width: 15; height: 15 }
            Text {
                text: habitWidgetRoot.targetHabitId && habitWidgetRoot.targetHabitId !== "all"
                    ? qsTr("Hábito") : qsTr("Hábitos do Dia")
                color: "#fffffe"
                font.pixelSize: 12
                font.weight: Font.DemiBold
            }
            Rectangle {
                height: 20
                width: dateText.implicitWidth + 12
                radius: 5
                color: "#1834d399"
                Text {
                    id: dateText
                    anchors.centerIn: parent
                    text: habitWidgetRoot.resolvedDate
                    color: "#6ee7b7"
                    font.pixelSize: 10
                    font.family: "monospace"
                }
            }
            Item { Layout.fillWidth: true }
            ToolButton {
                Layout.preferredWidth: 26
                Layout.preferredHeight: 26
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

        Text {
            visible: habitWidgetRoot.habitsList.length === 0
            text: qsTr("Nenhum hábito encontrado.")
            color: "#71717a"
            font.pixelSize: 12
        }

        Repeater {
            model: habitWidgetRoot.habitsList
            delegate: Rectangle {
                id: hRow
                required property var modelData
                readonly property bool done: Boolean(habitWidgetRoot.completedMap[modelData.id])
                Layout.fillWidth: true
                height: 36
                radius: 8
                color: done ? "#1510b981" : "#1d1c2e"
                border.color: done ? "#4010b981" : "#12ffffff"

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 10
                    anchors.rightMargin: 10
                    spacing: 10

                    Rectangle {
                        Layout.preferredWidth: 20
                        Layout.preferredHeight: 20
                        radius: 6
                        color: hRow.done ? (hRow.modelData.color || "#10b981") : "#27272a"
                        border.color: hRow.done ? "transparent" : "#3f3f46"
                        AppIcon {
                            anchors.centerIn: parent
                            visible: hRow.done
                            name: "check"
                            color: "#ffffff"
                            width: 12
                            height: 12
                        }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: habitWidgetRoot.toggleHabit(hRow.modelData.id)
                        }
                    }

                    Text {
                        text: (hRow.modelData.icon || "🔥") + " " + (hRow.modelData.title || hRow.modelData.name || "")
                        color: hRow.done ? "#94a1b2" : "#fffffe"
                        font.pixelSize: 13
                        font.strikeout: hRow.done
                        Layout.fillWidth: true
                        elide: Text.ElideRight
                    }

                    Text {
                        visible: Number(hRow.modelData.current_streak || 0) > 0
                        text: "🔥 " + Number(hRow.modelData.current_streak || 0) + "d"
                        color: "#fb923c"
                        font.pixelSize: 11
                        font.weight: Font.Medium
                    }

                    ToolButton {
                        Layout.preferredWidth: 24
                        Layout.preferredHeight: 24
                        focusPolicy: Qt.NoFocus
                        onClicked: habitWidgetRoot.statsRequested(hRow.modelData.id)
                        background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                        contentItem: AppIcon {
                            anchors.centerIn: parent
                            name: "analytics"
                            color: "#94a1b2"
                            width: 12
                            height: 12
                        }
                    }
                }
            }
        }
    }
}
