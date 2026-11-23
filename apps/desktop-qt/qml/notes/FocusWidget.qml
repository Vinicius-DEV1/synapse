import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: focusWidgetRoot
    implicitWidth: Math.min(parent ? parent.width : 540, contentCol.implicitWidth + 20)
    implicitHeight: 34
    radius: 7
    color: isCompleted ? "#1a10b981" : (hoverHandler.hovered ? "#338b5cf6" : "#1a8b5cf6")
    border.color: isCompleted ? "#3310b981" : "#338b5cf6"
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

    RowLayout {
        id: contentCol
        anchors.verticalCenter: parent.verticalCenter
        anchors.left: parent.left
        anchors.leftMargin: 10
        spacing: 8

        AppIcon {
            name: focusWidgetRoot.isCompleted ? "check" : "clock"
            color: focusWidgetRoot.isCompleted ? "#34d399" : "#a78bfa"
            width: 13
            height: 13
        }

        Text {
            text: focusWidgetRoot.isCompleted
                ? (qsTr("Foco concluído: ") + focusWidgetRoot.tagLabel)
                : (qsTr("Foco: ") + focusWidgetRoot.tagLabel)
            color: focusWidgetRoot.isCompleted ? "#34d399" : "#c4b5fd"
            font.pixelSize: 12
            font.weight: Font.Medium
            elide: Text.ElideRight
            Layout.maximumWidth: 260
        }

        Text {
            text: focusWidgetRoot.isCompleted
                ? (focusWidgetRoot.durationMinutes + "m")
                : (focusWidgetRoot.isRunning || focusWidgetRoot.remainingSeconds < focusWidgetRoot.durationMinutes * 60
                    ? focusWidgetRoot.formatTime(focusWidgetRoot.remainingSeconds)
                    : (focusWidgetRoot.durationMinutes + "m"))
            color: focusWidgetRoot.isCompleted ? "#34d399" : (focusWidgetRoot.isRunning ? "#fffffe" : "#a78bfa")
            font.pixelSize: 12
            font.weight: Font.DemiBold
            font.family: "monospace"
        }

        ToolButton {
            visible: !focusWidgetRoot.isCompleted
            Layout.preferredWidth: 22
            Layout.preferredHeight: 22
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: focusWidgetRoot.isRunning ? qsTr("Pausar") : qsTr("Iniciar")
            onClicked: {
                focusWidgetRoot.isRunning = !focusWidgetRoot.isRunning
                focusWidgetRoot.commitStatus(focusWidgetRoot.isRunning ? "running" : "paused")
            }
            background: Rectangle {
                radius: 5
                color: parent.hovered ? "#448b5cf6" : (focusWidgetRoot.isRunning ? "#338b5cf6" : "transparent")
            }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: focusWidgetRoot.isRunning ? "pause" : "play"
                color: "#c4b5fd"
                width: 11
                height: 11
            }
        }

        ToolButton {
            visible: !focusWidgetRoot.isCompleted && (hoverHandler.hovered || focusWidgetRoot.isRunning)
            Layout.preferredWidth: 22
            Layout.preferredHeight: 22
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Concluir agora")
            onClicked: focusWidgetRoot.completeSession()
            background: Rectangle { radius: 5; color: parent.hovered ? "#2210b981" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "check"; color: "#34d399"; width: 12; height: 12 }
        }

        ToolButton {
            visible: hoverHandler.hovered && (focusWidgetRoot.isCompleted || focusWidgetRoot.remainingSeconds < focusWidgetRoot.durationMinutes * 60)
            Layout.preferredWidth: 22
            Layout.preferredHeight: 22
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Resetar")
            onClicked: {
                focusWidgetRoot.isRunning = false
                focusWidgetRoot.isCompleted = false
                focusWidgetRoot.remainingSeconds = focusWidgetRoot.durationMinutes * 60
                focusWidgetRoot.commitStatus("paused")
            }
            background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "refresh"; color: "#94a1b2"; width: 11; height: 11 }
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
            contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 11; height: 11 }
        }
    }
}
