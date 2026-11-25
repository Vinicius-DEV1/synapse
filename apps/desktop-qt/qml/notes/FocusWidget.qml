import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: focusWidgetRoot
    implicitWidth: Math.min(parent ? parent.width : 560, contentRow.implicitWidth + 18)
    implicitHeight: 30
    radius: 6
    color: isCompleted
        ? "#1a10b981"
        : (isCancelled
            ? "#1aef4444"
            : (hoverHandler.hovered ? "#338b5cf6" : "#1a8b5cf6"))
    border.color: isCompleted
        ? "#3310b981"
        : (isCancelled ? "#33ef4444" : "#338b5cf6")
    border.width: 1
    Behavior on color { ColorAnimation { duration: 150 } }

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property int durationMinutes: Math.max(1, parseInt(attrs["data-duration"] || attrs["duration"] || "25", 10) || 25)
    property int remainingSeconds: {
        var left = parseInt(attrs["data-time-left"] || "", 10)
        return !isNaN(left) && left >= 0 ? left : durationMinutes * 60
    }
    property string tagLabel: attrs["data-tag"] || attrs["tag"] || "Estudo"
    property string description: attrs["data-description"] || attrs["description"] || qsTr("Sessão de Foco")
    property string statusStr: attrs["data-status"] || attrs["status"] || "running"
    property bool isCompleted: statusStr === "completed"
    property bool isCancelled: statusStr === "cancelled"
    property bool isRunning: false

    signal attrsUpdated(var newAttrs)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function formatTime(s) {
        var mins = Math.floor(s / 60)
        var secs = s % 60
        return (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs
    }

    function commitStatus(nextStatus) {
        statusStr = nextStatus
        var next = Object.assign({}, attrs)
        next["data-duration"] = String(durationMinutes)
        next["data-tag"] = tagLabel
        next["data-description"] = description
        next["data-status"] = nextStatus
        next["data-time-left"] = String(remainingSeconds)
        attrsUpdated(next)
    }

    function addQuickMinutes(mins) {
        durationMinutes += mins
        remainingSeconds += mins * 60
        commitStatus(isRunning ? "running" : "paused")
    }

    function completeSession() {
        isRunning = false
        isCompleted = true
        isCancelled = false
        remainingSeconds = 0
        if (typeof dataController !== "undefined" && dataController && typeof dataController.recordFocusSession === "function") {
            dataController.recordFocusSession(tagLabel, durationMinutes, "completed", "", description)
        }
        commitStatus("completed")
    }

    Timer {
        interval: 1000
        repeat: true
        running: focusWidgetRoot.isRunning && !focusWidgetRoot.isCompleted && !focusWidgetRoot.isCancelled
        onTriggered: {
            if (focusWidgetRoot.remainingSeconds > 1) {
                focusWidgetRoot.remainingSeconds -= 1
            } else {
                focusWidgetRoot.completeSession()
            }
        }
    }

    RowLayout {
        id: contentRow
        anchors.verticalCenter: parent.verticalCenter
        anchors.left: parent.left
        anchors.leftMargin: 9
        spacing: 6

        AppIcon {
            name: focusWidgetRoot.isCompleted
                ? "check-circle"
                : (focusWidgetRoot.isCancelled ? "close" : "hourglass")
            color: focusWidgetRoot.isCompleted
                ? "#34d399"
                : (focusWidgetRoot.isCancelled ? "#f87171" : "#c4b5fd")
            width: 13
            height: 13
        }

        Text {
            text: qsTr("Foco") + (focusWidgetRoot.tagLabel.length > 0 ? (": " + focusWidgetRoot.tagLabel) : "")
            color: focusWidgetRoot.isCompleted
                ? "#34d399"
                : (focusWidgetRoot.isCancelled ? "#f87171" : "#c4b5fd")
            font.pixelSize: 13
            font.weight: Font.Medium
            elide: Text.ElideRight
            Layout.maximumWidth: 200
        }

        Text {
            text: "-"
            color: focusWidgetRoot.isCompleted
                ? "#8034d399"
                : (focusWidgetRoot.isCancelled ? "#80f87171" : "#80c4b5fd")
            font.pixelSize: 13
        }

        Text {
            text: (!focusWidgetRoot.isCompleted && !focusWidgetRoot.isCancelled &&
                   (focusWidgetRoot.isRunning || focusWidgetRoot.remainingSeconds < focusWidgetRoot.durationMinutes * 60))
                ? focusWidgetRoot.formatTime(focusWidgetRoot.remainingSeconds)
                : (focusWidgetRoot.durationMinutes + "m")
            color: focusWidgetRoot.isCompleted
                ? "#34d399"
                : (focusWidgetRoot.isCancelled ? "#f87171" : (focusWidgetRoot.isRunning ? "#fffffe" : "#c4b5fd"))
            font.pixelSize: 13
            font.weight: Font.Medium
            font.family: "monospace"
        }

        // Hover-revealed quick controls matching FocusWidgetNodeView popover actions
        RowLayout {
            visible: hoverHandler.hovered || focusWidgetRoot.isRunning
            spacing: 2

            Rectangle {
                visible: !focusWidgetRoot.isCompleted && !focusWidgetRoot.isCancelled
                Layout.preferredWidth: 1
                Layout.preferredHeight: 14
                Layout.leftMargin: 2
                Layout.rightMargin: 2
                color: "#22ffffff"
            }

            ToolButton {
                visible: !focusWidgetRoot.isCompleted && !focusWidgetRoot.isCancelled
                Layout.preferredWidth: 22
                Layout.preferredHeight: 22
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: focusWidgetRoot.isRunning ? qsTr("Pausar") : qsTr("Iniciar Foco")
                onClicked: {
                    focusWidgetRoot.isRunning = !focusWidgetRoot.isRunning
                    focusWidgetRoot.commitStatus(focusWidgetRoot.isRunning ? "running" : "paused")
                }
                background: Rectangle {
                    radius: 5
                    color: parent.hovered ? "#338b5cf6" : "transparent"
                }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: focusWidgetRoot.isRunning ? "pause" : "play"
                    color: "#a78bfa"
                    width: 11
                    height: 11
                }
            }

            Button {
                visible: !focusWidgetRoot.isCompleted && !focusWidgetRoot.isCancelled && hoverHandler.hovered
                Layout.preferredHeight: 20
                leftPadding: 5
                rightPadding: 5
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("+5 minutos")
                onClicked: focusWidgetRoot.addQuickMinutes(5)
                background: Rectangle { radius: 4; color: parent.hovered ? "#1affffff" : "transparent" }
                contentItem: Text { text: "+5m"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }
            }

            ToolButton {
                visible: !focusWidgetRoot.isCompleted && !focusWidgetRoot.isCancelled
                Layout.preferredWidth: 22
                Layout.preferredHeight: 22
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Concluir sessão")
                onClicked: focusWidgetRoot.completeSession()
                background: Rectangle { radius: 5; color: parent.hovered ? "#2210b981" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "check"; color: "#34d399"; width: 11; height: 11 }
            }

            ToolButton {
                visible: hoverHandler.hovered && (focusWidgetRoot.isCompleted || focusWidgetRoot.isCancelled || focusWidgetRoot.remainingSeconds < focusWidgetRoot.durationMinutes * 60)
                Layout.preferredWidth: 22
                Layout.preferredHeight: 22
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Resetar timer")
                onClicked: {
                    focusWidgetRoot.isRunning = false
                    focusWidgetRoot.isCompleted = false
                    focusWidgetRoot.isCancelled = false
                    focusWidgetRoot.remainingSeconds = focusWidgetRoot.durationMinutes * 60
                    focusWidgetRoot.commitStatus("running")
                }
                background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "refresh"; color: "#a7a9be"; width: 11; height: 11 }
            }

            ToolButton {
                visible: hoverHandler.hovered
                Layout.preferredWidth: 22
                Layout.preferredHeight: 22
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Remover widget")
                onClicked: focusWidgetRoot.removeRequested()
                background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: parent.hovered ? "#f87171" : "#a7a9be"; width: 11; height: 11 }
            }
        }
    }
}
