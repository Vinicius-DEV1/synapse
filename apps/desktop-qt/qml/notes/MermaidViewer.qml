pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: mermaidRoot
    Layout.fillWidth: true
    implicitHeight: showCode ? Math.max(200, codeEditor.contentHeight + 76) : 320
    radius: 10
    color: "#13121d"
    border.color: hoverHandler.hovered ? "#338b5cf6" : "#1affffff"
    border.width: 1
    clip: true

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string chart: attrs["code"] || ""
    property bool showCode: false
    property real zoomLevel: 1.0
    property bool copiedNotice: false

    signal codeModified(string newCode)
    signal fullscreenRequested(string mermaidCode)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    onBlockDataChanged: {
        var nextCode = (blockData.attrs && blockData.attrs["code"]) || ""
        if (!codeEditor.activeFocus && nextCode !== chart) {
            chart = nextCode
            codeEditor.text = nextCode
        }
    }

    Timer {
        id: copyTimer
        interval: 2000
        onTriggered: mermaidRoot.copiedNotice = false
    }

    Timer {
        id: codeDebounce
        interval: 250
        onTriggered: mermaidRoot.codeModified(codeEditor.text)
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 40
            color: "#1a1924"

            Rectangle {
                anchors.bottom: parent.bottom
                anchors.left: parent.left
                anchors.right: parent.right
                height: 1
                color: "#0dffffff"
            }

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 10
                spacing: 8

                Rectangle {
                    width: 24
                    height: 24
                    radius: 6
                    color: "#268b5cf6"
                    border.color: "#408b5cf6"
                    AppIcon {
                        anchors.centerIn: parent
                        name: "diagrams"
                        color: "#c4b5fd"
                        width: 13
                        height: 13
                    }
                }

                Text {
                    text: qsTr("Diagrama Mermaid")
                    color: "#fffffe"
                    font.pixelSize: 12
                    font.weight: Font.DemiBold
                }

                Item { Layout.fillWidth: true }

                Button {
                    Layout.preferredHeight: 24
                    leftPadding: 8
                    rightPadding: 8
                    focusPolicy: Qt.NoFocus
                    onClicked: mermaidRoot.showCode = !mermaidRoot.showCode
                    background: Rectangle {
                        radius: 6
                        color: mermaidRoot.showCode ? "#268b5cf6" : (parent.hovered ? "#1affffff" : "transparent")
                    }
                    contentItem: RowLayout {
                        spacing: 4
                        AppIcon { name: mermaidRoot.showCode ? "eye" : "code"; color: "#c4b5fd"; width: 12; height: 12 }
                        Text {
                            text: mermaidRoot.showCode ? qsTr("Visualizar") : qsTr("Editar Código")
                            color: "#e2e8f0"
                            font.pixelSize: 11
                        }
                    }
                }

                ToolButton {
                    visible: !mermaidRoot.showCode
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    onClicked: mermaidRoot.zoomLevel = Math.max(0.5, mermaidRoot.zoomLevel - 0.15)
                    background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "minus"; color: "#a7a9be"; width: 12; height: 12 }
                }

                Text {
                    visible: !mermaidRoot.showCode
                    text: Math.round(mermaidRoot.zoomLevel * 100) + "%"
                    color: "#94a1b2"
                    font.pixelSize: 10
                    font.family: "monospace"
                }

                ToolButton {
                    visible: !mermaidRoot.showCode
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    onClicked: mermaidRoot.zoomLevel = Math.min(2.5, mermaidRoot.zoomLevel + 0.15)
                    background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "plus"; color: "#a7a9be"; width: 12; height: 12 }
                }

                ToolButton {
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: mermaidRoot.copiedNotice ? qsTr("Copiado!") : qsTr("Copiar código")
                    onClicked: {
                        if (typeof dataController !== "undefined" && dataController && typeof dataController.copyToClipboard === "function") {
                            dataController.copyToClipboard(mermaidRoot.chart)
                        }
                        mermaidRoot.copiedNotice = true
                        copyTimer.restart()
                    }
                    background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon {
                        anchors.centerIn: parent
                        name: mermaidRoot.copiedNotice ? "check" : "copy"
                        color: mermaidRoot.copiedNotice ? "#34d399" : "#a7a9be"
                        width: 12
                        height: 12
                    }
                }

                ToolButton {
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Tela cheia")
                    onClicked: mermaidRoot.fullscreenRequested(mermaidRoot.chart)
                    background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "maximize"; color: "#a7a9be"; width: 12; height: 12 }
                }

                ToolButton {
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Remover diagrama")
                    onClicked: mermaidRoot.removeRequested()
                    background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fb7185"; width: 12; height: 12 }
                }
            }
        }

        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true

            ScrollView {
                anchors.fill: parent
                anchors.margins: 10
                visible: mermaidRoot.showCode
                clip: true

                TextArea {
                    id: codeEditor
                    text: mermaidRoot.chart
                    color: "#e2e8f0"
                    font.pixelSize: 13
                    font.family: "JetBrains Mono, Fira Code, monospace"
                    background: Rectangle { radius: 6; color: "#0b0a10"; border.color: "#14ffffff" }
                    padding: 10
                    wrapMode: TextEdit.NoWrap
                    onTextChanged: {
                        if (activeFocus) {
                            mermaidRoot.chart = text
                            codeDebounce.restart()
                        }
                    }
                    onEditingFinished: {
                        codeDebounce.stop()
                        mermaidRoot.codeModified(text)
                    }
                }
            }

            Flickable {
                id: diagramFlickable
                anchors.fill: parent
                visible: !mermaidRoot.showCode
                clip: true
                contentWidth: Math.max(width, diagramContainer.width * mermaidRoot.zoomLevel)
                contentHeight: Math.max(height, diagramContainer.height * mermaidRoot.zoomLevel)

                Item {
                    id: diagramContainer
                    width: Math.max(diagramFlickable.width - 32, 460)
                    height: Math.max(diagramFlickable.height - 24, 240)
                    scale: mermaidRoot.zoomLevel
                    transformOrigin: Item.TopLeft

                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 12

                        Repeater {
                            model: {
                                var lines = String(mermaidRoot.chart || "").split("\n")
                                var nodes = []
                                for (var i = 0; i < lines.length; i++) {
                                    var line = lines[i].trim()
                                    if (line.length === 0 || line.indexOf("%%") === 0 ||
                                        line.indexOf("graph") === 0 || line.indexOf("flowchart") === 0 ||
                                        line.indexOf("sequenceDiagram") === 0) continue
                                    nodes.push(line)
                                }
                                return nodes.slice(0, 10)
                            }
                            delegate: Rectangle {
                                required property string modelData
                                required property int index
                                Layout.alignment: Qt.AlignHCenter
                                width: Math.max(200, nodeText.implicitWidth + 32)
                                height: 38
                                radius: 8
                                color: "#1c1b29"
                                border.color: "#668b5cf6"
                                border.width: 1

                                Text {
                                    id: nodeText
                                    anchors.centerIn: parent
                                    text: parent.modelData
                                    color: "#f4f4f5"
                                    font.pixelSize: 12
                                    font.weight: Font.Medium
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
