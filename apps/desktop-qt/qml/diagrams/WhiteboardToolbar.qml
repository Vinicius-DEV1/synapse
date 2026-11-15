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
    property int activeLineWidth: 2
    property real zoomLevel: 1.0

    signal backRequested()
    signal toolSelected(string tool)
    signal colorSelected(string color)
    signal lineWidthSelected(int width)
    signal undoRequested()
    signal redoRequested()
    signal zoomInRequested()
    signal zoomOutRequested()
    signal zoomResetRequested()
    signal exportRequested()
    signal importRequested()
    signal clearRequested()
    signal saveRequested()

    RowLayout {
        anchors.fill: parent
        anchors.margins: 10
        spacing: 8

        // Back Button
        Rectangle {
            width: 76; height: 32; radius: 6; color: "#211f30"
            RowLayout {
                anchors.centerIn: parent; spacing: 4
                Text { text: "←"; color: "#a7a9be"; font.pixelSize: 13; font.bold: true }
                Text { text: "Voltar"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            }
            MouseArea {
                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                onClicked: toolbarRoot.backRequested()
            }
        }

        // Title
        Text {
            text: toolbarRoot.diagramTitle
            color: "#fffffe"
            font.pixelSize: 14
            font.bold: true
            elide: Text.ElideRight
            Layout.maximumWidth: 140
        }

        Rectangle { width: 1; height: 20; color: "#12ffffff" }

        // Primary Drawing Tools
        RowLayout {
            spacing: 3
            Repeater {
                model: [
                    { tool: "hand", label: "✋" },
                    { tool: "pen", label: "✏️" },
                    { tool: "rect", label: "▭" },
                    { tool: "circle", label: "○" },
                    { tool: "arrow", label: "➔" },
                    { tool: "line", label: "―" },
                    { tool: "diamond", label: "◇" },
                    { tool: "text", label: "🔤" },
                    { tool: "sticky", label: "📌" },
                    { tool: "eraser", label: "⌫" }
                ]
                delegate: Rectangle {
                    property bool isSelected: toolbarRoot.activeTool === modelData.tool
                    width: 32; height: 32; radius: 6
                    color: isSelected ? "#8b5cf6" : "#211f30"
                    border.color: isSelected ? "#a78bfa" : "#10ffffff"

                    Text {
                        anchors.centerIn: parent
                        text: modelData.label
                        color: isSelected ? "#ffffff" : "#a7a9be"
                        font.pixelSize: 13
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

        Rectangle { width: 1; height: 20; color: "#12ffffff" }

        // Stroke Width
        RowLayout {
            spacing: 3
            Repeater {
                model: [
                    { width: 1, label: "1x" },
                    { width: 2, label: "2x" },
                    { width: 4, label: "4x" }
                ]
                delegate: Rectangle {
                    property bool isSelected: toolbarRoot.activeLineWidth === modelData.width
                    width: 28; height: 28; radius: 6
                    color: isSelected ? "#8b5cf6" : "#211f30"
                    Text {
                        anchors.centerIn: parent
                        text: modelData.label
                        color: isSelected ? "#ffffff" : "#a7a9be"
                        font.pixelSize: 10
                        font.bold: true
                    }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: toolbarRoot.lineWidthSelected(modelData.width)
                    }
                }
            }
        }

        Rectangle { width: 1; height: 20; color: "#12ffffff" }

        // Colors
        RowLayout {
            spacing: 4
            Repeater {
                model: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#fffffe"]
                Rectangle {
                    width: 20; height: 20; radius: 10
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

        Item { Layout.fillWidth: true }

        // Undo & Redo
        RowLayout {
            spacing: 3
            Rectangle {
                width: 28; height: 28; radius: 6; color: "#211f30"
                Text { anchors.centerIn: parent; text: "↶"; color: "#a7a9be"; font.pixelSize: 13; font.bold: true }
                MouseArea {
                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                    onClicked: toolbarRoot.undoRequested()
                }
            }
            Rectangle {
                width: 28; height: 28; radius: 6; color: "#211f30"
                Text { anchors.centerIn: parent; text: "↷"; color: "#a7a9be"; font.pixelSize: 13; font.bold: true }
                MouseArea {
                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                    onClicked: toolbarRoot.redoRequested()
                }
            }
        }

        // Zoom Controls
        RowLayout {
            spacing: 3
            Rectangle {
                width: 26; height: 26; radius: 6; color: "#211f30"
                Text { anchors.centerIn: parent; text: "−"; color: "#a7a9be"; font.pixelSize: 14; font.bold: true }
                MouseArea {
                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                    onClicked: toolbarRoot.zoomOutRequested()
                }
            }
            Text {
                text: Math.round(toolbarRoot.zoomLevel * 100) + "%"
                color: "#c4b5fd"
                font.pixelSize: 11
                font.bold: true
                Layout.preferredWidth: 38
                horizontalAlignment: Text.AlignHCenter
            }
            Rectangle {
                width: 26; height: 26; radius: 6; color: "#211f30"
                Text { anchors.centerIn: parent; text: "+"; color: "#a7a9be"; font.pixelSize: 14; font.bold: true }
                MouseArea {
                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                    onClicked: toolbarRoot.zoomInRequested()
                }
            }
        }

        // Import & Export
        Rectangle {
            width: 32; height: 32; radius: 6; color: "#211f30"
            Text { anchors.centerIn: parent; text: "📥"; font.pixelSize: 13 }
            MouseArea {
                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                onClicked: toolbarRoot.importRequested()
            }
        }
        Rectangle {
            width: 32; height: 32; radius: 6; color: "#211f30"
            Text { anchors.centerIn: parent; text: "📤"; font.pixelSize: 13 }
            MouseArea {
                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                onClicked: toolbarRoot.exportRequested()
            }
        }

        // Clear
        Rectangle {
            width: 32; height: 32; radius: 6; color: "#18f43f5e"; border.color: "#33f43f5e"
            Text { anchors.centerIn: parent; text: "🗑"; font.pixelSize: 13 }
            MouseArea {
                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                onClicked: toolbarRoot.clearRequested()
            }
        }

        // Save
        Rectangle {
            width: 68; height: 32; radius: 6; color: "#10b981"
            Text { anchors.centerIn: parent; text: "Salvar ✓"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            MouseArea {
                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                onClicked: toolbarRoot.saveRequested()
            }
        }
    }
}
