import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: qBlockRoot
    Layout.fillWidth: true
    implicitHeight: col.implicitHeight + 28
    radius: 10
    color: "#181828"
    border.color: "#ffffff10"
    border.width: 1

    property string prompt: "Qual o tamanho padrão do chunk criptografado no formato ENC1 do Synapse?"
    property var options: ["64 KB", "256 KB", "1 MB", "4 MB"]
    property int correctIndex: 2
    property int selectedIndex: -1
    property bool revealed: false

    ColumnLayout {
        id: col
        anchors.fill: parent
        anchors.margins: 14
        spacing: 10

        Text {
            Layout.fillWidth: true
            text: "❓ " + qBlockRoot.prompt
            color: "#f4f4f5"
            font.pixelSize: 14
            font.weight: Font.Medium
            wrapMode: Text.Wrap
        }

        Repeater {
            model: qBlockRoot.options
            delegate: Rectangle {
                Layout.fillWidth: true
                height: 32
                radius: 6

                property bool isChosen: qBlockRoot.selectedIndex === index
                property bool isRight: index === qBlockRoot.correctIndex

                color: {
                    if (!qBlockRoot.revealed) return isChosen ? "#2e2d4d" : "#222138";
                    if (isRight) return "#10b98125";
                    if (isChosen && !isRight) return "#f43f5e25";
                    return "#222138";
                }
                border.color: {
                    if (!qBlockRoot.revealed) return isChosen ? "#6366f1" : "transparent";
                    if (isRight) return "#10b981";
                    if (isChosen && !isRight) return "#f43f5e";
                    return "transparent";
                }
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 10
                    anchors.rightMargin: 10
                    spacing: 8

                    Text {
                        text: String.fromCharCode(65 + index) + ")"
                        color: "#a1a1aa"
                        font.pixelSize: 12
                        font.bold: true
                    }

                    Text {
                        Layout.fillWidth: true
                        text: modelData
                        color: "#e4e4e7"
                        font.pixelSize: 13
                    }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        qBlockRoot.selectedIndex = index;
                        qBlockRoot.revealed = true;
                    }
                }
            }
        }
    }
}

