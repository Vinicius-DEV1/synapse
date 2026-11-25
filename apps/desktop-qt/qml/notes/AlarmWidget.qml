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
    property var controller: null
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
        var c = alarmRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
        if (!alarmId || !c || typeof c.getAlarms !== "function") return
        var list = c.getAlarms() || []
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
        var c = alarmRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
        if (alarmId && c && typeof c.toggleAlarm === "function") {
            c.toggleAlarm(alarmId)
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
            ToolTip.text: qsTr("Editar alarme")
            onClicked: {
                editTimeField.text = alarmRoot.timeStr
                editLabelField.text = alarmRoot.label
                alarmEditPopup.open()
            }
            background: Rectangle { radius: 4; color: parent.hovered ? "#228b5cf6" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "edit"; color: parent.hovered ? "#c4b5fd" : "#a7a9be"; width: 11; height: 11 }
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

    Popup {
        id: alarmEditPopup
        y: alarmRoot.height + 6
        width: 240
        padding: 10
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        background: Rectangle { color: "#1a1924"; radius: 10; border.color: "#338b5cf6" }
        contentItem: ColumnLayout {
            spacing: 6
            RowLayout {
                spacing: 6
                TextField {
                    id: editTimeField
                    Layout.preferredWidth: 72
                    Layout.preferredHeight: 28
                    color: "#fffffe"
                    font.pixelSize: 12
                    horizontalAlignment: Text.AlignHCenter
                    background: Rectangle { radius: 6; color: "#0f0e17"; border.color: "#2e2e38" }
                }
                TextField {
                    id: editLabelField
                    Layout.fillWidth: true
                    Layout.preferredHeight: 28
                    placeholderText: qsTr("Rótulo...")
                    color: "#fffffe"
                    font.pixelSize: 12
                    background: Rectangle { radius: 6; color: "#0f0e17"; border.color: "#2e2e38" }
                }
            }
            Button {
                Layout.fillWidth: true
                Layout.preferredHeight: 28
                onClicked: {
                    alarmRoot.timeStr = editTimeField.text.trim() || alarmRoot.timeStr
                    alarmRoot.label = editLabelField.text.trim()
                    if (alarmRoot.alarmId && typeof dataController !== "undefined" && dataController &&
                            typeof dataController.updateAlarm === "function") {
                        dataController.updateAlarm(alarmRoot.alarmId, alarmRoot.timeStr, alarmRoot.label, "beep", alarmRoot.isPending, "")
                    }
                    var next = Object.assign({}, alarmRoot.attrs)
                    next["data-time"] = alarmRoot.timeStr
                    next["data-label"] = alarmRoot.label
                    alarmRoot.attrsUpdated(next)
                    alarmEditPopup.close()
                }
                background: Rectangle { radius: 6; color: "#7c3aed" }
                contentItem: Text { text: qsTr("Salvar"); color: "#fff"; font.pixelSize: 11; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
    }
}
