import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

// Inline Focus Pomodoro pill synced with global SynapseDataController clock so timer persists across page navigation.
Rectangle {
    id: focusWidgetRoot
    implicitWidth: Math.min(parent ? parent.width : 560, contentRow.implicitWidth + 18)
    implicitHeight: 30
    radius: 6
    color: isCompleted ? "#1a10b981" : (isCancelled ? "#1aef4444" : (hoverHandler.hovered ? "#338b5cf6" : "#1a8b5cf6"))
    border.color: isCompleted ? "#3310b981" : (isCancelled ? "#33ef4444" : "#338b5cf6")
    border.width: 1
    Behavior on color { ColorAnimation { duration: 150 } }

    property var blockData: ({})
    property var controller: null
    property var attrs: blockData && blockData.attrs ? blockData.attrs : ({})
    property int durationMinutes: Math.max(1, parseInt(attrs["data-duration"] || attrs["duration"] || "25", 10) || 25)
    property string tagLabel: attrs["data-tag"] || attrs["tag"] || "Estudo"
    property string description: attrs["data-description"] || attrs["description"] || qsTr("Sessão de Foco")
    property string statusStr: attrs["data-status"] || attrs["status"] || "idle"
    property bool isCompleted: statusStr === "completed"
    property bool isCancelled: statusStr === "cancelled"

    readonly property var ctrl: controller || (typeof dataController !== "undefined" ? dataController : null)
    readonly property bool isGlobalMatching: Boolean(ctrl && ctrl.focusTag === tagLabel && (ctrl.focusRunning || ctrl.focusRemainingSeconds > 0))
    readonly property bool isRunning: Boolean(ctrl && ctrl.focusRunning && isGlobalMatching)
    readonly property int remainingSeconds: {
        if (isGlobalMatching && ctrl.focusRemainingSeconds > 0) return ctrl.focusRemainingSeconds
        var left = parseInt(attrs["data-time-left"] || "", 10)
        return !isNaN(left) && left > 0 ? left : durationMinutes * 60
    }

    signal attrsUpdated(var newAttrs)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function formatTime(s) {
        var mins = Math.floor(s / 60); var secs = s % 60
        return (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs
    }

    function commitStatus(nextStatus, leftSec) {
        statusStr = nextStatus
        var next = Object.assign({}, attrs)
        next["data-duration"] = String(durationMinutes)
        next["data-tag"] = tagLabel
        next["data-description"] = description
        next["data-status"] = nextStatus
        next["data-time-left"] = String(leftSec !== undefined ? leftSec : remainingSeconds)
        attrsUpdated(next)
    }

    Connections {
        target: focusWidgetRoot.ctrl
        ignoreUnknownSignals: true
        function onFocusTimerCompleted(tag, mins, desc) {
            if (tag === focusWidgetRoot.tagLabel) {
                focusWidgetRoot.isCompleted = true
                focusWidgetRoot.commitStatus("completed", 0)
            }
        }
    }

    RowLayout {
        id: contentRow
        anchors.verticalCenter: parent.verticalCenter
        anchors.left: parent.left; anchors.leftMargin: 9
        spacing: 6

        AppIcon {
            name: focusWidgetRoot.isCompleted ? "check-circle" : (focusWidgetRoot.isCancelled ? "close" : "hourglass")
            color: focusWidgetRoot.isCompleted ? "#34d399" : (focusWidgetRoot.isCancelled ? "#f87171" : "#c4b5fd")
            width: 13; height: 13
        }

        Text {
            text: qsTr("Foco") + (focusWidgetRoot.tagLabel.length > 0 ? (": " + focusWidgetRoot.tagLabel) : "")
            color: focusWidgetRoot.isCompleted ? "#34d399" : (focusWidgetRoot.isCancelled ? "#f87171" : "#c4b5fd")
            font.pixelSize: 13; font.weight: Font.Medium; elide: Text.ElideRight; Layout.maximumWidth: 200
        }

        Text { text: "-"; color: "#80c4b5fd"; font.pixelSize: 13 }

        Text {
            text: (!focusWidgetRoot.isCompleted && !focusWidgetRoot.isCancelled &&
                   (focusWidgetRoot.isRunning || focusWidgetRoot.remainingSeconds < focusWidgetRoot.durationMinutes * 60))
                ? focusWidgetRoot.formatTime(focusWidgetRoot.remainingSeconds)
                : (focusWidgetRoot.durationMinutes + "m")
            color: focusWidgetRoot.isCompleted ? "#34d399" : (focusWidgetRoot.isRunning ? "#fffffe" : "#c4b5fd")
            font.pixelSize: 13; font.weight: Font.Medium; font.family: "monospace"
        }

        RowLayout {
            visible: hoverHandler.hovered || focusWidgetRoot.isRunning
            spacing: 2

            Rectangle { visible: !focusWidgetRoot.isCompleted && !focusWidgetRoot.isCancelled; Layout.preferredWidth: 1; Layout.preferredHeight: 14; color: "#22ffffff" }

            ToolButton {
                visible: !focusWidgetRoot.isCompleted && !focusWidgetRoot.isCancelled
                Layout.preferredWidth: 22; Layout.preferredHeight: 22; focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered; ToolTip.text: focusWidgetRoot.isRunning ? qsTr("Pausar") : qsTr("Iniciar Foco Global")
                onClicked: {
                    var c = focusWidgetRoot.ctrl
                    if (!c) return
                    if (focusWidgetRoot.isGlobalMatching && typeof c.toggleFocusTimer === "function") {
                        c.toggleFocusTimer()
                    } else if (typeof c.startFocusTimer === "function") {
                        c.startFocusTimer(focusWidgetRoot.durationMinutes, focusWidgetRoot.tagLabel, focusWidgetRoot.description)
                    }
                    focusWidgetRoot.commitStatus("running", focusWidgetRoot.remainingSeconds)
                }
                background: Rectangle { radius: 5; color: parent.hovered ? "#338b5cf6" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: focusWidgetRoot.isRunning ? "pause" : "play"; color: "#a78bfa"; width: 11; height: 11 }
            }

            Button {
                visible: !focusWidgetRoot.isCompleted && !focusWidgetRoot.isCancelled && hoverHandler.hovered
                Layout.preferredHeight: 20; leftPadding: 5; rightPadding: 5; focusPolicy: Qt.NoFocus
                onClicked: {
                    focusWidgetRoot.durationMinutes += 5
                    if (focusWidgetRoot.isGlobalMatching && focusWidgetRoot.ctrl && typeof focusWidgetRoot.ctrl.addFocusMinutes === "function") {
                        focusWidgetRoot.ctrl.addFocusMinutes(5)
                    }
                    focusWidgetRoot.commitStatus(focusWidgetRoot.isRunning ? "running" : "paused", focusWidgetRoot.remainingSeconds + 300)
                }
                background: Rectangle { radius: 4; color: parent.hovered ? "#1affffff" : "transparent" }
                contentItem: Text { text: "+5m"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }
            }

            ToolButton {
                visible: !focusWidgetRoot.isCompleted && !focusWidgetRoot.isCancelled
                Layout.preferredWidth: 22; Layout.preferredHeight: 22; focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered; ToolTip.text: qsTr("Concluir sessão")
                onClicked: {
                    if (focusWidgetRoot.ctrl && typeof focusWidgetRoot.ctrl.stopFocusTimer === "function") {
                        focusWidgetRoot.ctrl.stopFocusTimer(true)
                    }
                    focusWidgetRoot.isCompleted = true
                    focusWidgetRoot.commitStatus("completed", 0)
                }
                background: Rectangle { radius: 5; color: parent.hovered ? "#2210b981" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "check"; color: "#34d399"; width: 11; height: 11 }
            }

            ToolButton {
                visible: hoverHandler.hovered && (focusWidgetRoot.isCompleted || focusWidgetRoot.isCancelled || focusWidgetRoot.remainingSeconds < focusWidgetRoot.durationMinutes * 60)
                Layout.preferredWidth: 22; Layout.preferredHeight: 22; focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered; ToolTip.text: qsTr("Resetar timer")
                onClicked: {
                    focusWidgetRoot.isCompleted = false; focusWidgetRoot.isCancelled = false
                    if (focusWidgetRoot.isGlobalMatching && focusWidgetRoot.ctrl && typeof focusWidgetRoot.ctrl.resetFocusTimer === "function") {
                        focusWidgetRoot.ctrl.resetFocusTimer()
                    }
                    focusWidgetRoot.commitStatus("idle", focusWidgetRoot.durationMinutes * 60)
                }
                background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "refresh"; color: "#a7a9be"; width: 11; height: 11 }
            }

            ToolButton {
                visible: hoverHandler.hovered
                Layout.preferredWidth: 22; Layout.preferredHeight: 22; focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered; ToolTip.text: qsTr("Remover widget")
                onClicked: focusWidgetRoot.removeRequested()
                background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: parent.hovered ? "#f87171" : "#a7a9be"; width: 11; height: 11 }
            }
        }
    }
}
