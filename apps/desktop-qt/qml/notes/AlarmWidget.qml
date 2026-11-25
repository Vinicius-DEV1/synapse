import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: alarmRoot
    implicitWidth: Math.min(parent ? parent.width : 440, pillRow.implicitWidth + 18)
    implicitHeight: 30
    radius: 6

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string alarmId: attrs["data-alarm-id"] || attrs["alarm-id"] || attrs["alarmId"] || ""
    property string timeStr: attrs["data-time"] || attrs["time"] || attrs["timeStr"] || "08:00"
    property string label: attrs["data-label"] || attrs["label"] || ""
    property string status: attrs["data-status"] || attrs["status"] || "pending"

    readonly property bool isTriggered: status === "triggered"
    readonly property bool isCancelled: status === "cancelled"
    readonly property bool isPending: !isTriggered && !isCancelled

    color: isTriggered
        ? "#1a10b981"
        : (isCancelled
            ? "#1aef4444"
            : (hoverHandler.hovered ? "#338b5cf6" : "#1a8b5cf6"))
    border.color: isTriggered
        ? "#3310b981"
        : (isCancelled ? "#33ef4444" : "#338b5cf6")
    border.width: 1
    Behavior on color { ColorAnimation { duration: 150 } }

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
        anchors.verticalCenter: parent.verticalCenter
        anchors.left: parent.left
        anchors.leftMargin: 9
        spacing: 6

        AppIcon {
            name: alarmRoot.isTriggered
                ? "check-circle"
                : (alarmRoot.isCancelled ? "close" : "bell")
            color: alarmRoot.isTriggered
                ? "#34d399"
                : (alarmRoot.isCancelled ? "#f87171" : "#c4b5fd")
            Layout.preferredWidth: 13
            Layout.preferredHeight: 13
        }

        Text {
            text: qsTr("Alarme") + (alarmRoot.label.length > 0 ? (": " + alarmRoot.label) : "")
            color: alarmRoot.isTriggered
                ? "#34d399"
                : (alarmRoot.isCancelled ? "#f87171" : "#c4b5fd")
            font.pixelSize: 13
            font.weight: Font.Medium
            elide: Text.ElideRight
            Layout.maximumWidth: 200
        }

        Text {
            text: "-"
            color: alarmRoot.isTriggered
                ? "#8034d399"
                : (alarmRoot.isCancelled ? "#80f87171" : "#80c4b5fd")
            font.pixelSize: 13
        }

        Text {
            text: alarmRoot.timeStr
            color: alarmRoot.isTriggered
                ? "#34d399"
                : (alarmRoot.isCancelled ? "#f87171" : "#c4b5fd")
            font.pixelSize: 13
            font.weight: Font.Medium
            font.family: "monospace"
        }

        ToolButton {
            visible: hoverHandler.hovered
            Layout.preferredWidth: 20
            Layout.preferredHeight: 20
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Remover alarme da nota")
            onClicked: alarmRoot.removeRequested()
            background: Rectangle { radius: 4; color: parent.hovered ? "#22ef4444" : "transparent" }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "close"
                color: parent.hovered ? "#f87171" : "#a7a9be"
                width: 11
                height: 11
            }
        }
    }

    MouseArea {
        anchors.fill: parent
        z: -1
        cursorShape: Qt.PointingHandCursor
        onClicked: alarmRoot.toggleAlarmState()
    }
}
