pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: imageToolbar
    property bool active: false
    property string alignment: "center"
    visible: active
    implicitWidth: active ? 5 * 28 + 4 * 4 : 0
    implicitHeight: 30

    signal alignmentRequested(string alignment)
    signal fitRequested()
    signal resetRequested()

    RowLayout {
        anchors.fill: parent
        spacing: 4

        Repeater {
            model: ["left", "center", "right"]
            delegate: Rectangle {
                id: alignmentButton
                required property string modelData
                readonly property string accessibleLabel: modelData === "left" ? qsTr("Align image left")
                    : modelData === "right" ? qsTr("Align image right") : qsTr("Center image")
                Layout.preferredWidth: 28
                Layout.preferredHeight: 26
                radius: 4
                color: imageToolbar.alignment === modelData ? "#1b8b5cf6" : "#08ffffff"
                Accessible.name: accessibleLabel
                ToolTip.visible: alignmentMouse.containsMouse
                ToolTip.text: accessibleLabel
                Text {
                    anchors.centerIn: parent
                    text: alignmentButton.modelData === "left" ? "⇤"
                        : alignmentButton.modelData === "right" ? "⇥" : "↔"
                    color: "#c4b5fd"
                    font.pixelSize: 14
                }
                MouseArea {
                    id: alignmentMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: imageToolbar.alignmentRequested(alignmentButton.modelData)
                }
            }
        }
        Rectangle {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            radius: 4
            color: fitMouse.containsMouse ? "#12ffffff" : "#08ffffff"
            Accessible.name: qsTr("Fit image to editor width")
            ToolTip.visible: fitMouse.containsMouse
            ToolTip.text: qsTr("Fit image to editor width")
            Text { anchors.centerIn: parent; text: "↔"; color: "#c4b5fd"; font.pixelSize: 14 }
            MouseArea {
                id: fitMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: imageToolbar.fitRequested()
            }
        }
        Rectangle {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            radius: 4
            color: resetMouse.containsMouse ? "#12ffffff" : "#08ffffff"
            Accessible.name: qsTr("Reset image size")
            ToolTip.visible: resetMouse.containsMouse
            ToolTip.text: qsTr("Reset image size")
            Text { anchors.centerIn: parent; text: "↺"; color: "#c4b5fd"; font.pixelSize: 14 }
            MouseArea {
                id: resetMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: imageToolbar.resetRequested()
            }
        }
    }
}
