import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: fullscreenModalRoot
    anchors.fill: parent
    z: 130
    visible: false
    color: "#09090b"

    property var controller: null
    property string chart: ""
    signal closeRequested()

    Shortcut {
        sequence: "Escape"
        enabled: fullscreenModalRoot.visible
        onActivated: fullscreenModalRoot.closeRequested()
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Header
        Rectangle {
            Layout.fillWidth: true
            height: 52
            color: "#121216"
            border.color: "#1affffff"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 20
                anchors.rightMargin: 16
                spacing: 12

                Text {
                    text: "📊 " + qsTr("Diagrama Mermaid (Tela Cheia)")
                    color: "#ffffff"
                    font.pixelSize: 13
                    font.bold: true
                }

                Item { Layout.fillWidth: true }

                ToolButton {
                    text: "✕"
                    implicitWidth: 32
                    implicitHeight: 32
                    onClicked: fullscreenModalRoot.closeRequested()
                    contentItem: Text {
                        text: parent.text
                        color: "#a1a1aa"
                        font.pixelSize: 16
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        color: parent.hovered ? "#22ffffff" : "transparent"
                        radius: 6
                    }
                }
            }
        }

        // Expanded Viewer
        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true

            MermaidViewer {
                anchors.fill: parent
                controller: fullscreenModalRoot.controller
                chart: fullscreenModalRoot.chart
            }
        }
    }
}
