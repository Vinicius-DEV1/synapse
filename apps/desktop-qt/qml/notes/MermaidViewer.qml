import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: mermaidRoot
    width: parent ? parent.width : 600
    height: 380
    radius: 10
    color: "#131317"
    border.color: "#27272a"
    clip: true

    property string chart: ""
    property bool showCode: false
    property real zoomLevel: 1.0
    property bool copiedNotice: false

    signal fullscreenRequested(string mermaidCode)

    Timer {
        id: copyTimer
        interval: 2000
        onTriggered: mermaidRoot.copiedNotice = false
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Toolbar
        Rectangle {
            Layout.fillWidth: true
            height: 42
            color: "#18181f"
            border.color: "#27272a"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                spacing: 8

                // Diagram Type Badge
                Rectangle {
                    width: 24
                    height: 24
                    radius: 6
                    color: "#3b82f6"
                    Text {
                        anchors.centerIn: parent
                        text: "📊"
                        font.pixelSize: 12
                    }
                }

                Text {
                    text: qsTr("Diagrama Mermaid")
                    color: "#e4e4e7"
                    font.pixelSize: 12
                    font.bold: true
                }

                Item { Layout.fillWidth: true }

                // Toggle Diagram / Code
                Button {
                    text: mermaidRoot.showCode ? qsTr("Diagrama") : qsTr("Código")
                    flat: true
                    onClicked: mermaidRoot.showCode = !mermaidRoot.showCode
                    contentItem: Text {
                        text: parent.text
                        color: "#a1a1aa"
                        font.pixelSize: 11
                    }
                }

                // Zoom Out
                ToolButton {
                    text: "-"
                    implicitWidth: 26
                    implicitHeight: 26
                    visible: !mermaidRoot.showCode
                    onClicked: mermaidRoot.zoomLevel = Math.max(0.5, mermaidRoot.zoomLevel - 0.15)
                    contentItem: Text {
                        text: parent.text
                        color: "#a1a1aa"
                        font.pixelSize: 14
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }

                Text {
                    text: Math.round(mermaidRoot.zoomLevel * 100) + "%"
                    color: "#71717a"
                    font.pixelSize: 10
                    font.family: "Monospace"
                    visible: !mermaidRoot.showCode
                }

                // Zoom In
                ToolButton {
                    text: "+"
                    implicitWidth: 26
                    implicitHeight: 26
                    visible: !mermaidRoot.showCode
                    onClicked: mermaidRoot.zoomLevel = Math.min(2.5, mermaidRoot.zoomLevel + 0.15)
                    contentItem: Text {
                        text: parent.text
                        color: "#a1a1aa"
                        font.pixelSize: 14
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }

                // Copy Code Button
                Button {
                    text: mermaidRoot.copiedNotice ? qsTr("Copiado! ✓") : qsTr("Copiar")
                    flat: true
                    onClicked: {
                        controller.copyToClipboard(mermaidRoot.chart)
                        mermaidRoot.copiedNotice = true
                        copyTimer.restart()
                    }
                    contentItem: Text {
                        text: parent.text
                        color: mermaidRoot.copiedNotice ? "#34d399" : "#a1a1aa"
                        font.pixelSize: 11
                    }
                }

                // Fullscreen Button
                ToolButton {
                    text: "⛶"
                    implicitWidth: 28
                    implicitHeight: 28
                    onClicked: mermaidRoot.fullscreenRequested(mermaidRoot.chart)
                    contentItem: Text {
                        text: parent.text
                        color: "#a1a1aa"
                        font.pixelSize: 13
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }

        // View Canvas
        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true

            // Code View
            ScrollView {
                anchors.fill: parent
                visible: mermaidRoot.showCode
                clip: true

                TextArea {
                    readOnly: true
                    text: mermaidRoot.chart
                    color: "#38bdf8"
                    font.pixelSize: 12
                    font.family: "Monospace"
                    background: null
                    wrapMode: TextEdit.NoWrap
                }
            }

            // Visual Diagram Representation
            Flickable {
                id: diagramFlickable
                anchors.fill: parent
                visible: !mermaidRoot.showCode
                clip: true
                contentWidth: Math.max(width, diagramContainer.width * mermaidRoot.zoomLevel)
                contentHeight: Math.max(height, diagramContainer.height * mermaidRoot.zoomLevel)

                Item {
                    id: diagramContainer
                    width: Math.max(diagramFlickable.width - 40, 500)
                    height: Math.max(diagramFlickable.height - 40, 300)
                    scale: mermaidRoot.zoomLevel
                    transformOrigin: Item.TopLeft

                    // Simple flow diagram node parser for common mermaid statements
                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 16

                        Repeater {
                            model: {
                                var lines = mermaidRoot.chart.split("\n")
                                var nodes = []
                                for (var i = 0; i < lines.length; i++) {
                                    var line = lines[i].trim()
                                    if (line.length === 0 || line.startsWith("%%") || line.startsWith("graph") || line.startsWith("flowchart")) continue
                                    nodes.push(line)
                                }
                                return nodes.slice(0, 8)
                            }

                            delegate: Rectangle {
                                required property var modelData
                                required property int index
                                width: Math.max(180, nodeText.implicitWidth + 32)
                                height: 42
                                radius: 8
                                color: "#1e1e28"
                                border.color: "#3b82f6"
                                border.width: 1

                                ColumnLayout {
                                    anchors.centerIn: parent
                                    spacing: 2
                                    Text {
                                        id: nodeText
                                        text: modelData
                                        color: "#f4f4f5"
                                        font.pixelSize: 12
                                        font.bold: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
