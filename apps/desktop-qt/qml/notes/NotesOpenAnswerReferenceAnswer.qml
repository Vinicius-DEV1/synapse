import QtQuick 2.15
import QtQuick.Layouts 1.15

Item {
    id: answerRoot
    objectName: "notesOpenAnswerReferenceAnswer"
    property string answerText: ""
    readonly property bool hasAnswer: answerText.trim().length > 0

    visible: hasAnswer
    implicitHeight: answerColumn.implicitHeight

    ColumnLayout {
        id: answerColumn
        anchors.left: parent.left
        anchors.right: parent.right
        spacing: 6

        RowLayout {
            Layout.fillWidth: true
            spacing: 7
            Rectangle {
                Layout.preferredWidth: 4
                Layout.preferredHeight: 14
                radius: 2
                color: "#fbbf24"
            }
            Text {
                text: qsTr("Gabarito de Referência:")
                color: "#fcd34d"
                font.pixelSize: 12
                font.weight: Font.DemiBold
                font.capitalization: Font.AllUppercase
                Layout.fillWidth: true
            }
        }

        Text {
            text: answerRoot.answerText
            color: "#d4d4d8"
            font.pixelSize: 12
            wrapMode: Text.Wrap
            Layout.fillWidth: true
        }
    }
}
