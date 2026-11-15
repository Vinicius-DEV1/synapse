import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root
    Layout.fillWidth: true
    implicitHeight: contentCol.implicitHeight + 36
    radius: 14
    color: "#161524"
    border.color: "#18ffffff"
    border.width: 1

    property string editorFont: "Inter"
    property int editorFontSize: 16
    property double editorLineHeight: 1.6
    property int autoSaveSeconds: 2
    property bool spellCheckEnabled: true

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        anchors.margins: 20
        spacing: 16

        // Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Text { text: "✍️"; font.pixelSize: 22 }
            ColumnLayout {
                spacing: 2
                Text {
                    text: "Editor de Notas & Tipografia"
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                }
                Text {
                    text: "Personalize a experiência de escrita e legibilidade do editor"
                    color: "#94a3b8"
                    font.pixelSize: 12
                }
            }
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

        // Font Family
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6
            Text { text: "FAMÍLIA DA FONTE DO EDITOR"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Repeater {
                    model: [
                        { id: "Inter", label: "Sem Serifa (Inter)" },
                        { id: "Georgia", label: "Com Serifa (Georgia)" },
                        { id: "Monospace", label: "Monoespaçada" }
                    ]
                    delegate: Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 38
                        radius: 8
                        color: root.editorFont === modelData.id ? "#342b58" : "#1a1928"
                        border.color: root.editorFont === modelData.id ? "#818cf8" : "#15ffffff"

                        Text {
                            anchors.centerIn: parent
                            text: modelData.label
                            color: root.editorFont === modelData.id ? "#ddd6fe" : "#c4c5d4"
                            font.pixelSize: 12
                            font.bold: root.editorFont === modelData.id
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.editorFont = modelData.id
                        }
                    }
                }
            }
        }

        // Font size & line height
        RowLayout {
            Layout.fillWidth: true
            spacing: 16

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6
                Text { text: "TAMANHO DA FONTE (" + root.editorFontSize + "px)"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }

                Slider {
                    Layout.fillWidth: true
                    from: 13
                    to: 22
                    stepSize: 1
                    value: root.editorFontSize
                    onMoved: root.editorFontSize = Math.round(value)
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6
                Text { text: "ALTURA DA LINHA (" + root.editorLineHeight.toFixed(1) + ")"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }

                Slider {
                    Layout.fillWidth: true
                    from: 1.2
                    to: 2.2
                    stepSize: 0.1
                    value: root.editorLineHeight
                    onMoved: root.editorLineHeight = value
                }
            }
        }

        // Auto-save interval
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            Text { text: "Intervalo de Salvamento Automático:"; color: "#d4d4dc"; font.pixelSize: 13 }
            Item { Layout.fillWidth: true }

            RowLayout {
                spacing: 6
                Repeater {
                    model: [1, 2, 5]
                    delegate: Rectangle {
                        width: 44
                        height: 28
                        radius: 6
                        color: root.autoSaveSeconds === modelData ? "#6366f1" : "#1a1928"
                        border.color: "#20ffffff"

                        Text {
                            anchors.centerIn: parent
                            text: modelData + "s"
                            color: "#fffffe"
                            font.pixelSize: 11
                            font.bold: true
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.autoSaveSeconds = modelData
                        }
                    }
                }
            }
        }
    }
}
