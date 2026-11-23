import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: alarmRoot
    implicitWidth: Math.min(parent ? parent.width : 420, pillRow.implicitWidth + 24)
    implicitHeight: 36
    radius: 9

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string alarmId: attrs["data-alarm-id"] || attrs["alarm-id"] || ""
    property string timeStr: attrs["data-time"] || attrs["time"] || "08:00"
    property string label: attrs["data-label"] || attrs["label"] || qsTr("Alarme")
    property string status: attrs["data-status"] || attrs["status"] || "pending"

    readonly property bool isPending: status === "pending" || status === "active"
    readonly property bool isTriggered: status === "triggered"

    color: isTriggered ? "#2a2015" : (isPending ? "#1e1438" : "#16161e")
    border.color: isTriggered ? "#f59e0b" : (isPending ? "#7c3aed" : "#374151")
    border.width: 1

    signal attrsUpdated(var newAttrs)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function syncFromCore() {
        if (!alarmId || typeof dataController === "undefined" || !dataController || typeof dataController.getAlarms !== "function") return
        var list = dataController.getAlarms() || []
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === alarmId) {
                timeStr = list[i].time || timeStr
                label = list[i].label || label
                status = list[i].enabled ? "pending" : "cancelled"
                break
            }
        }
    }

    function toggleAlarmState() {
        if (alarmId && typeof dataController !== "undefined" && dataController && typeof dataController.toggleAlarm === "function") {
            dataController.toggleAlarm(alarmId)
        }
        status = isPending ? "cancelled" : "pending"
        var next = Object.assign({}, attrs)
        next["data-alarm-id"] = alarmId
        next["data-time"] = timeStr
        next["data-label"] = label
        next["data-status"] = status
        attrsUpdated(next)
    }

    Component.onCompleted: syncFromCore()
    onBlockDataChanged: syncFromCore()

    RowLayout {
        id: pillRow
        anchors.centerIn: parent
        spacing: 8

        AppIcon {
            name: "clock"
            color: alarmRoot.isTriggered ? "#34d399" : (alarmRoot.isPending ? "#c4b5fd" : "#f87171")
            Layout.preferredWidth: 14
            Layout.preferredHeight: 14
        }

        Text {
            text: alarmRoot.timeStr
            color: "#fffffe"
            font.pixelSize: 12
            font.weight: Font.Bold
            font.family: "monospace"
        }

        Text {
            text: "• " + (alarmRoot.label || qsTr("Alarme"))
            color: alarmRoot.isPending ? "#c4b5fd" : "#9ca3af"
            font.pixelSize: 12
        }

        Rectangle {
            visible: alarmRoot.isTriggered || !alarmRoot.isPending
            Layout.preferredHeight: 18
            Layout.preferredWidth: statusLbl.implicitWidth + 10
            radius: 4
            color: alarmRoot.isTriggered ? "#f59e0b" : "#27272a"
            Text {
                id: statusLbl
                anchors.centerIn: parent
                text: alarmRoot.isTriggered ? "DISPARADO" : qsTr("DESATIVADO")
                color: alarmRoot.isTriggered ? "#000000" : "#a1a1aa"
                font.pixelSize: 9
                font.weight: Font.Bold
            }
        }

        ToolButton {
            visible: hoverHandler.hovered
            Layout.preferredWidth: 22
            Layout.preferredHeight: 22
            focusPolicy: Qt.NoFocus
            onClicked: alarmRoot.removeRequested()
            background: Rectangle { radius: 4; color: parent.hovered ? "#22ef4444" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#fda4af"; width: 10; height: 10 }
        }
    }

    MouseArea {
        anchors.fill: parent
        z: -1
        cursorShape: Qt.PointingHandCursor
        onClicked: alarmRoot.toggleAlarmState()
    }
}
