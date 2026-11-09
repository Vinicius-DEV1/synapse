import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: codeBlockRoot
    Layout.fillWidth: true
    implicitHeight: codeContentCol.implicitHeight + 24
    radius: 8
    color: "#0d0d12"
    border.color: "#ffffff12"
    border.width: 1

    property string language: "rust"
    property string code: "pub fn calculate_fsrs(r: &Review) -> SrsState {\n    let interval = calculate_next_interval(r.stability, 0.9);\n    SrsState { stability: 12.5, difficulty: 4.2, due_days: interval }\n}"

    ColumnLayout {
        id: codeContentCol
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            Text {
                text: codeBlockRoot.language.toUpperCase()
                color: "#71717a"
                font.pixelSize: 11
                font.bold: true
                font.family: "Monospace"
            }
            Item { Layout.fillWidth: true }
            Text {
                text: "📋 Copiar"
                color: "#a1a1aa"
                font.pixelSize: 11
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        // Copy to clipboard
                    }
                }
            }
        }

        Text {
            Layout.fillWidth: true
            text: codeBlockRoot.code
            color: "#38bdf8"
            font.family: "JetBrains Mono, Consolas, Monospace"
            font.pixelSize: 13
            wrapMode: Text.Wrap
            lineHeight: 1.4
        }
    }
}

