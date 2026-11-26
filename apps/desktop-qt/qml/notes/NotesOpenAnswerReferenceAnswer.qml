import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: answerRoot
    objectName: "notesOpenAnswerReferenceAnswer"
    property string answerText: ""
    readonly property bool hasAnswer: answerText.trim().length > 0

    visible: hasAnswer
    implicitHeight: answerColumn.implicitHeight + 28
    radius: 12
    color: "#1af59e0b"
    border.color: "#33f59e0b"

    ColumnLayout {
        id: answerColumn
        anchors.fill: parent
        anchors.margins: 14
        spacing: 8

        Text {
            text: qsTr("Gabarito de Referência:")
            color: "#fde68a"
            font.pixelSize: 12
            font.weight: Font.DemiBold
            font.capitalization: Font.AllUppercase
            Layout.fillWidth: true
        }
        Text {
            text: answerRoot.answerText
            color: "#e4e4e7"
            font.pixelSize: 13
            wrapMode: Text.Wrap
            Layout.fillWidth: true
        }
    }
}
