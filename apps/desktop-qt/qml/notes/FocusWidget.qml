import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: focusWidgetRoot
    Layout.fillWidth: true
    implicitHeight: contentCol.implicitHeight + 22
    radius: 12
    color: "#141820"
    border.color: isCompleted ? "#4010b981" : (isRunning ? "#558b5cf6" : "#18ffffff")
    border.width: 1

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property int durationMinutes: Math.max(1, parseInt(attrs["data-duration"] || attrs["duration"] || "25", 10) || 25)
    property int remainingSeconds: {
        var left = parseInt(attrs["data-time-left"] || "", 10)
        return !isNaN(left) && left >= 0 ? left : durationMinutes * 60
    }
    property string tagLabel: attrs["data-tag"] || attrs["tag"] || "Estudo"
    property string description: attrs["data-description"] || attrs["description"] || qsTr("Sessão de Foco")
    property bool isCompleted: (attrs["data-status"] || attrs["status"] || "") === "completed"
    property bool isRunning: false

    signal attrsUpdated(var newAttrs)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function formatTime(s) {
        var mins = Math.floor(s / 60)
        var secs = s % 60
        return (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs
    }

    function commitStatus(statusStr) {
        var next = Object.assign({}, attrs)
        next["data-duration"] = String(durationMinutes)
        next["data-tag"] = tagLabel
        next["data-description"] = description
        next["data-status"] = statusStr
        next["data-time-left"] = String(remainingSeconds)
        attrsUpdated(next)
    }

    function completeSession() {
        isRunning = false
        isCompleted = true
        remainingSeconds = 0
        if (typeof dataController !== "undefined" && dataController && typeof dataController.recordFocusSession === "function") {
            dataController.recordFocusSession(tagLabel, durationMinutes, "completed", "", description)
        }
        commitStatus("completed")
    }

    Timer {
        interval: 1000
        repeat: true
        running: focusWidgetRoot.isRunning && !focusWidgetRoot.isCompleted
        onTriggered: {
            if (focusWidgetRoot.remainingSeconds > 1) {
                focusWidgetRoot.remainingSeconds -= 1
            } else {
                focusWidgetRoot.completeSession()
            }
        }
    }

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Rectangle {
                Layout.preferredWidth: 32
                Layout.preferredHeight: 32
                radius: 8
                color: focusWidgetRoot.isCompleted ? "#2010b981" : "#208b5cf6"
                AppIcon {
                    anchors.centerIn: parent
                    name: focusWidgetRoot.isCompleted ? "check" : "focus"
                    color: focusWidgetRoot.isCompleted ? "#34d399" : "#a78bfa"
                    width: 16
                    height: 16
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2
                Text {
                    text: focusWidgetRoot.description + "  •  #" + focusWidgetRoot.tagLabel
                    color: "#fffffe"
                    font.pixelSize: 13
                    font.weight: Font.DemiBold
                    elide: Text.ElideRight
                    Layout.fillWidth: true
                }
                Text {
                    text: focusWidgetRoot.isCompleted ? qsTr("Sessão concluída")
                        : (focusWidgetRoot.isRunning ? qsTr("Em foco") : qsTr("Pausado • ") + focusWidgetRoot.durationMinutes + " min")
                    color: focusWidgetRoot.isCompleted ? "#34d399" : "#94a1b2"
                    font.pixelSize: 11
                }
            }

            Text {
                text: focusWidgetRoot.formatTime(focusWidgetRoot.remainingSeconds)
                color: focusWidgetRoot.isCompleted ? "#34d399" : "#fffffe"
                font.pixelSize: 20
                font.bold: true
                font.family: "monospace"
            }

            Button {
                visible: !focusWidgetRoot.isCompleted
                Layout.preferredHeight: 28
                Layout.preferredWidth: 74
                focusPolicy: Qt.NoFocus
                onClicked: {
                    focusWidgetRoot.isRunning = !focusWidgetRoot.isRunning
                    focusWidgetRoot.commitStatus(focusWidgetRoot.isRunning ? "running" : "paused")
                }
                background: Rectangle {
                    radius: 7
                    color: focusWidgetRoot.isRunning ? "#27272a" : "#7c3aed"
                }
                contentItem: Text {
                    text: focusWidgetRoot.isRunning ? qsTr("Pausar") : qsTr("Iniciar")
                    color: "#ffffff"
                    font.pixelSize: 11
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            ToolButton {
                visible: !focusWidgetRoot.isCompleted
                Layout.preferredWidth: 28
                Layout.preferredHeight: 28
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Concluir agora")
                onClicked: focusWidgetRoot.completeSession()
                background: Rectangle { radius: 6; color: parent.hovered ? "#2210b981" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "check"; color: "#34d399"; width: 14; height: 14 }
            }

            ToolButton {
                Layout.preferredWidth: 28
                Layout.preferredHeight: 28
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Resetar")
                onClicked: {
                    focusWidgetRoot.isRunning = false
                    focusWidgetRoot.isCompleted = false
                    focusWidgetRoot.remainingSeconds = focusWidgetRoot.durationMinutes * 60
                    focusWidgetRoot.commitStatus("paused")
                }
                background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "refresh"; color: "#94a1b2"; width: 13; height: 13 }
            }

            ToolButton {
                visible: hoverHandler.hovered
                Layout.preferredWidth: 28
                Layout.preferredHeight: 28
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Remover widget")
                onClicked: focusWidgetRoot.removeRequested()
                background: Rectangle { radius: 6; color: parent.hovered ? "#22ef4444" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 13; height: 13 }
            }
        }
    }
}
