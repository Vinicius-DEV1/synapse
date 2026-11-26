import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: feedbackRoot
    objectName: "notesOpenAnswerFeedback"
    property var feedback: null
    property bool discussionEnabled: false

    signal discussRequested()

    visible: feedback !== null
    implicitHeight: feedbackColumn.implicitHeight + 28
    radius: 12
    color: feedback && feedback.verdict === "Correto"
        ? "#1a10b981" : (feedback && feedback.verdict === "Parcial" ? "#1af59e0b" : "#1af43f5e")
    border.color: feedback && feedback.verdict === "Correto"
        ? "#3310b981" : (feedback && feedback.verdict === "Parcial" ? "#33f59e0b" : "#33f43f5e")

    ColumnLayout {
        id: feedbackColumn
        anchors.fill: parent
        anchors.margins: 14
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            Text {
                text: "✦"
                color: "#c4b5fd"
                font.pixelSize: 14
            }
            Text {
                Layout.fillWidth: true
                text: qsTr("Avaliação: %1").arg(feedbackRoot.feedback ? feedbackRoot.feedback.verdict : "")
                color: feedbackRoot.feedback && feedbackRoot.feedback.verdict === "Correto"
                    ? "#a7f3d0" : (feedbackRoot.feedback && feedbackRoot.feedback.verdict === "Parcial"
                                   ? "#fde68a" : "#fda4af")
                font.pixelSize: 13
                font.weight: Font.DemiBold
            }
            Text {
                visible: Boolean(feedbackRoot.feedback && feedbackRoot.feedback.model)
                text: "Gemini AI · " + (feedbackRoot.feedback && feedbackRoot.feedback.model
                                         ? feedbackRoot.feedback.model : "")
                color: "#a1a1aa"
                font.pixelSize: 10
            }
        }
        Text {
            Layout.fillWidth: true
            text: feedbackRoot.feedback ? feedbackRoot.feedback.feedback : ""
            color: "#e4e4e7"
            font.pixelSize: 12
            wrapMode: Text.Wrap
        }
        Rectangle {
            visible: feedbackRoot.discussionEnabled
            Layout.fillWidth: true
            Layout.preferredHeight: 1
            color: "#10ffffff"
        }
        Button {
            visible: feedbackRoot.discussionEnabled
            Layout.alignment: Qt.AlignRight
            text: qsTr("Discutir com Assistente IA")
            onClicked: feedbackRoot.discussRequested()
        }
    }
}
