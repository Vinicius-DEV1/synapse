import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: toolbarRoot
    Layout.fillWidth: true
    height: 56
    color: "#161524"
    border.color: "#0fffffff"
    border.width: 1

    property string diagramTitle: "Diagrama"
    property string activeTool: "pen"
    property string activeDrawColor: "#8b5cf6"

    signal backRequested()
    signal toolSelected(string tool)
    signal colorSelected(string color)
    signal clearRequested()
    signal saveRequested()

    RowLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 12

        // Back Button
        Rectangle {
            width: 90; height: 34; radius: 8; color: "#211f30"
            RowLayout {
                anchors.centerIn: parent; spacing: 4
                Text { text: "←"; color: "#a7a9be"; font.pixelSize: 14; font.bold: true }
                Text { text: "Voltar"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
            }
            MouseArea {
                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                onClicked: toolbarRoot.backRequested()
            }
        }

        Rectangle { width: 1; height: 24; color: "#12ffffff" }

        // Title
        Text {
            text: toolbarRoot.diagramTitle
            color: "#fffffe"
            font.pixelSize: 16
            font.bold: true
        }

        Item { Layout.fillWidth: true }

        // Drawing Tools Group
        RowLayout {
            spacing: 4

            Repeater {
                model: [
                    { tool: "pen", label: "✏️ Caneta" },
                    { tool: "rect", label: "▭ Retângulo" },
                    { tool: "circle", label: "○ Círculo" },
                    { tool: "sticky", label: "📌 Nota" }
                ]
                delegate: Rectangle {
                    property bool isSelected: toolbarRoot.activeTool === modelData.tool
                    width: 86; height: 32; radius: 6
                    color: isSelected ? "#8b5cf6" : "#211f30"
                    border.color: isSelected ? "#a78bfa" : "#10ffffff"

                    Text {
                        anchors.centerIn: parent
                        text: modelData.label
                        color: isSelected ? "#ffffff" : "#a7a9be"
                        font.pixelSize: 11
                        font.bold: isSelected
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: toolbarRoot.toolSelected(modelData.tool)
                    }
                }
            }
        }

        Rectangle { width: 1; height: 24; color: "#12ffffff" }

        // Color Selector
        RowLayout {
            spacing: 6
            Repeater {
                model: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#fffffe"]
                Rectangle {
                    width: 22; height: 22; radius: 11
                    color: modelData
                    border.color: toolbarRoot.activeDrawColor === modelData ? "#ffffff" : "transparent"
                    border.width: 2
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: toolbarRoot.colorSelected(modelData)
                    }
                }
            }
        }

        Rectangle { width: 1; height: 24; color: "#12ffffff" }

        // Clear Canvas
        Rectangle {
            width: 76; height: 32; radius: 6; color: "#18f43f5e"; border.color: "#33f43f5e"
            Text { anchors.centerIn: parent; text: "Limpar"; color: "#fda4af"; font.pixelSize: 11; font.bold: true }
            MouseArea {
                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                onClicked: toolbarRoot.clearRequested()
            }
        }

        // Save Action
        Rectangle {
            width: 80; height: 32; radius: 6; color: "#10b981"
            Text { anchors.centerIn: parent; text: "Salvar ✓"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            MouseArea {
                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                onClicked: toolbarRoot.saveRequested()
            }
        }
    }
}
