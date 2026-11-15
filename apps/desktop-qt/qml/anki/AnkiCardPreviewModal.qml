import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: previewModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 120

    property var card: null
    signal closeRequested()

    Shortcut {
        sequence: "Escape"
        enabled: previewModalRoot.visible
        onActivated: previewModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: previewModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 640)
        height: Math.min(parent.height - 48, 520)
        radius: 16
        color: "#161524"
        border.color: "#27272a"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text {
                    text: qsTr("Detalhes do Cartão")
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                }

                Rectangle {
                    height: 20
                    width: typeBadgeText.implicitWidth + 12
                    radius: 10
                    color: "#256366f1"
                    Text {
                        id: typeBadgeText
                        anchors.centerIn: parent
                        text: card ? (card.card_type || "reading") : "reading"
                        color: "#a78bfa"
                        font.pixelSize: 10
                        font.bold: true
                    }
                }

                Item { Layout.fillWidth: true }

                ToolButton {
                    text: "✕"
                    onClicked: previewModalRoot.closeRequested()
                }
            }

            // Scrollable Content
            ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true

                ColumnLayout {
                    width: parent.width
                    spacing: 16

                    // Front Section
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4
                        Text { text: qsTr("FRENTE"); color: "#818cf8"; font.pixelSize: 11; font.bold: true }
                        Text {
                            Layout.fillWidth: true
                            text: card ? (card.front || "") : ""
                            color: "#ffffff"
                            font.pixelSize: 15
                            font.bold: true
                            wrapMode: Text.Wrap
                        }
                    }

                    Rectangle { Layout.fillWidth: true; height: 1; color: "#1affffff" }

                    // Back Section
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4
                        Text { text: qsTr("VERSO"); color: "#34d399"; font.pixelSize: 11; font.bold: true }
                        Text {
                            Layout.fillWidth: true
                            text: card ? (card.back || "") : ""
                            color: "#d4d4d8"
                            font.pixelSize: 14
                            wrapMode: Text.Wrap
                        }
                    }

                    // Extra note
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4
                        visible: card && card.extra_note && card.extra_note.length > 0
                        Text { text: qsTr("ANOTAÇÃO ADICIONAL"); color: "#fbbf24"; font.pixelSize: 11; font.bold: true }
                        Text {
                            Layout.fillWidth: true
                            text: card ? (card.extra_note || "") : ""
                            color: "#a1a1aa"
                            font.pixelSize: 13
                            wrapMode: Text.Wrap
                        }
                    }

                    Rectangle { Layout.fillWidth: true; height: 1; color: "#1affffff" }

                    // FSRS Metrics Grid
                    GridLayout {
                        columns: 3
                        Layout.fillWidth: true
                        rowSpacing: 10
                        columnSpacing: 16

                        ColumnLayout {
                            Text { text: qsTr("Repetições"); color: "#71717a"; font.pixelSize: 10 }
                            Text { text: String(card ? (card.reps || 0) : 0); color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                        }
                        ColumnLayout {
                            Text { text: qsTr("Estabilidade (dias)"); color: "#71717a"; font.pixelSize: 10 }
                            Text { text: String(card ? (card.stability || 0) : 0); color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                        }
                        ColumnLayout {
                            Text { text: qsTr("Dificuldade (0-10)"); color: "#71717a"; font.pixelSize: 10 }
                            Text { text: String(card ? (card.difficulty || 0) : 0); color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                        }
                    }
                }
            }
        }
    }
}
