import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: alarmRoot
    implicitWidth: pillRow.implicitWidth + 20
    implicitHeight: 30
    radius: 8

    property string alarmId: ""
    property string timeStr: "00:00"
    property string label: "Alarme"
    property string status: "pending" // "pending", "triggered", "cancelled"

    readonly property bool isPending: status === "pending"
    readonly property bool isTriggered: status === "triggered"

    color: isTriggered ? "#2a2015" : (isPending ? "#1e1438" : "#16161e")
    border.color: isTriggered ? "#f59e0b" : (isPending ? "#7c3aed" : "#374151")
    border.width: 1

    signal toggleRequested()
    signal cancelRequested()

    RowLayout {
        id: pillRow
        anchors.centerIn: parent
        spacing: 6

        AppIcon {
            name: "focus"
            color: alarmRoot.isTriggered ? "#f59e0b" : (alarmRoot.isPending ? "#a78bfa" : "#6b7280")
            Layout.preferredWidth: 14
            Layout.preferredHeight: 14
        }

        Text {
            text: alarmRoot.timeStr
            color: "#fffffe"
            font.pixelSize: 11
            font.weight: Font.Bold
            font.family: "monospace"
        }

        Text {
            text: "• " + (alarmRoot.label || "Alarme")
            color: alarmRoot.isPending ? "#c4b5fd" : "#9ca3af"
            font.pixelSize: 11
        }

        Rectangle {
            visible: alarmRoot.isTriggered
            Layout.preferredHeight: 16
            Layout.preferredWidth: 64
            radius: 4
            color: "#f59e0b"
            Text {
                anchors.centerIn: parent
                text: "DISPARADO"
                color: "#000000"
                font.pixelSize: 8
                font.weight: Font.Bold
            }
        }
    }

    MouseArea {
        anchors.fill: parent
        cursorShape: Qt.PointingHandCursor
        onClicked: {
            if (alarmRoot.isPending) {
                alarmMenu.popup()
            }
        }
    }

    Menu {
        id: alarmMenu
        background: Rectangle {
            color: "#16161e"
            border.color: "#2e2e38"
            border.width: 1
            radius: 8
        }

        Action {
            text: "Cancelar Alarme"
            onTriggered: {
                alarmRoot.status = "cancelled"
                alarmRoot.cancelRequested()
            }
        }
    }
}
