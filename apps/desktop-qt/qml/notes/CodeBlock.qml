import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: codeBlockRoot
    Layout.fillWidth: true
    implicitHeight: codeContentCol.implicitHeight
    radius: 12
    color: "#0d1117"
    border.color: hoverHandler.hovered ? "#33ffffff" : "#1affffff"
    border.width: 1
    clip: true
    Behavior on border.color { ColorAnimation { duration: 150 } }

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string language: attrs["data-language"] || attrs["language"] || "auto"
    property string code: blockData.innerHtml || ""
    property bool copied: false

    signal askAiRequested(string codeText)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    Timer {
        id: copiedTimer
        interval: 2000
        onTriggered: codeBlockRoot.copied = false
    }

    ColumnLayout {
        id: codeContentCol
        width: parent.width
        spacing: 0

        // Terminal Header Bar matching CodeBlockComponent.tsx (#161b22/90 border-b border-white/5)
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 36
            color: "#e6161b22"

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
                spacing: 10

                // macOS traffic dots
                RowLayout {
                    spacing: 6
                    Rectangle { width: 10; height: 10; radius: 5; color: hoverHandler.hovered ? "#ff5f56" : "#b3ff5f56" }
                    Rectangle { width: 10; height: 10; radius: 5; color: hoverHandler.hovered ? "#ffbd2e" : "#b3ffbd2e" }
                    Rectangle { width: 10; height: 10; radius: 5; color: hoverHandler.hovered ? "#27c93f" : "#b327c93f" }
                }

                Rectangle {
                    Layout.preferredWidth: 1
                    Layout.preferredHeight: 12
                    color: "#1affffff"
                }

                RowLayout {
                    spacing: 6
                    AppIcon { name: "code"; color: "#cc8b5cf6"; width: 13; height: 13 }
                    Text {
                        text: codeBlockRoot.language.toUpperCase()
                        color: "#d4d4d8"
                        font.pixelSize: 11
                        font.family: "monospace"
                        font.weight: Font.Medium
                    }
                }

                Item { Layout.fillWidth: true }

                // Copy button
                Button {
                    Layout.preferredHeight: 24
                    leftPadding: 8
                    rightPadding: 8
                    focusPolicy: Qt.NoFocus
                    onClicked: {
                        codeEdit.selectAll()
                        codeEdit.copy()
                        codeEdit.deselect()
                        codeBlockRoot.copied = true
                        copiedTimer.restart()
                    }
                    background: Rectangle {
                        radius: 6
                        color: codeBlockRoot.copied ? "#3310b981" : (parent.hovered ? "#1affffff" : "#0dffffff")
                        border.color: codeBlockRoot.copied ? "#6610b981" : "#1affffff"
                        border.width: 1
                    }
                    contentItem: RowLayout {
                        spacing: 4
                        AppIcon {
                            name: codeBlockRoot.copied ? "check" : "copy"
                            color: codeBlockRoot.copied ? "#6ee7b7" : "#d4d4d8"
                            width: 12
                            height: 12
                        }
                        Text {
                            text: codeBlockRoot.copied ? qsTr("Copiado!") : qsTr("Copiar")
                            color: codeBlockRoot.copied ? "#6ee7b7" : "#d4d4d8"
                            font.pixelSize: 11
                            font.weight: Font.Medium
                        }
                    }
                }

                // AI button
                Button {
                    Layout.preferredHeight: 24
                    leftPadding: 8
                    rightPadding: 8
                    focusPolicy: Qt.NoFocus
                    onClicked: codeBlockRoot.askAiRequested(codeBlockRoot.code)
                    background: Rectangle {
                        radius: 6
                        color: parent.hovered ? "#338b5cf6" : "transparent"
                        border.color: parent.hovered ? "#4d8b5cf6" : "transparent"
                        border.width: 1
                    }
                    contentItem: RowLayout {
                        spacing: 4
                        AppIcon { name: "sparkles"; color: "#a78bfa"; width: 12; height: 12 }
                        Text { text: "IA"; color: "#a78bfa"; font.pixelSize: 11; font.weight: Font.Medium }
                    }
                }

                ToolButton {
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    onClicked: codeBlockRoot.removeRequested()
                    background: Rectangle { radius: 6; color: parent.hovered ? "#22ef4444" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: parent.hovered ? "#fb7185" : "#a1a1aa"; width: 12; height: 12 }
                }
            }
        }

        TextEdit {
            id: codeEdit
            Layout.fillWidth: true
            Layout.margins: 14
            text: codeBlockRoot.code
            readOnly: true
            selectByMouse: true
            color: "#e6edf3"
            font.family: "JetBrains Mono, Consolas, Monospace"
            font.pixelSize: 13
            wrapMode: TextEdit.Wrap
        }
    }
}
