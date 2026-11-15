pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

RowLayout {
    id: controlsRoot
    spacing: 2
    Layout.preferredHeight: 28

    property bool isMaximized: false
    signal minimizeClicked()
    signal maximizeClicked()
    signal closeClicked()

    // Minimize Button
    Rectangle {
        id: minBtn
        Layout.preferredWidth: 32
        Layout.preferredHeight: 28
        radius: 6
        color: minMouse.containsMouse ? "#1affffff" : "transparent"
        ToolTip.text: qsTr("Minimizar")
        ToolTip.visible: minMouse.containsMouse
        ToolTip.delay: 300

        Text {
            anchors.centerIn: parent
            text: "─"
            color: minMouse.containsMouse ? "#ffffff" : "#a7a9be"
            font.pixelSize: 12
        }

        MouseArea {
            id: minMouse
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: controlsRoot.minimizeClicked()
        }
    }

    // Maximize / Restore Button
    Rectangle {
        id: maxBtn
        Layout.preferredWidth: 32
        Layout.preferredHeight: 28
        radius: 6
        color: maxMouse.containsMouse ? "#1affffff" : "transparent"
        ToolTip.text: controlsRoot.isMaximized ? qsTr("Restaurar") : qsTr("Maximizar")
        ToolTip.visible: maxMouse.containsMouse
        ToolTip.delay: 300

        Text {
            anchors.centerIn: parent
            text: controlsRoot.isMaximized ? "❐" : "□"
            color: maxMouse.containsMouse ? "#ffffff" : "#a7a9be"
            font.pixelSize: 11
        }

        MouseArea {
            id: maxMouse
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: controlsRoot.maximizeClicked()
        }
    }

    // Close Button
    Rectangle {
        id: closeBtn
        Layout.preferredWidth: 32
        Layout.preferredHeight: 28
        radius: 6
        color: closeMouse.containsMouse ? "#e11d48" : "transparent"
        ToolTip.text: qsTr("Fechar")
        ToolTip.visible: closeMouse.containsMouse
        ToolTip.delay: 300

        Text {
            anchors.centerIn: parent
            text: "✕"
            color: closeMouse.containsMouse ? "#ffffff" : "#a7a9be"
            font.pixelSize: 12
        }

        MouseArea {
            id: closeMouse
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: controlsRoot.closeClicked()
        }
    }
}
