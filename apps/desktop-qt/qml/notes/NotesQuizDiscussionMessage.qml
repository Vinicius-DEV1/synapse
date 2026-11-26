import QtQuick 2.15
import QtQuick.Layouts 1.15
import "." as Notes

Rectangle {
    id: messageRoot
    property string role: "assistant"
    property string bodyText: ""
    property var actions: []
    property string validationSummary: ""
    property bool actionsBusy: false
    readonly property bool isUserMessage: role === "user"

    signal applyActionRequested(string actionId)
    signal rejectActionRequested(string actionId)
    signal applyAllRequested()
    signal rejectAllRequested()

    Layout.alignment: isUserMessage ? Qt.AlignRight : Qt.AlignLeft
    Layout.maximumWidth: parent.width * 0.92
    width: Math.min(parent.width * 0.92, actions.length > 0 ? 660 : Math.max(180, messageText.implicitWidth + 32))
    implicitHeight: messageLayout.implicitHeight + 24
    radius: 16
    color: isUserMessage ? "#7c3aed" : "#201b2c"
    border.color: isUserMessage ? "#8b5cf6" : "#4c1d95"

    ColumnLayout {
        id: messageLayout
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8
        Text {
            id: messageText
            Layout.fillWidth: true
            text: messageRoot.bodyText
            textFormat: Text.MarkdownText
            color: messageRoot.isUserMessage ? "#ffffff" : "#f3e8ff"
            font.pixelSize: 12
            wrapMode: Text.Wrap
            linkColor: "#c4b5fd"
        }
        Text {
            Layout.fillWidth: true
            visible: messageRoot.validationSummary.length > 0
            text: messageRoot.validationSummary
            color: "#a7f3d0"
            font.pixelSize: 10
            wrapMode: Text.Wrap
        }
        Notes.NotesQuizDiscussionProposalList {
            Layout.fillWidth: true
            visible: messageRoot.actions.length > 0
            actions: messageRoot.actions
            busy: messageRoot.actionsBusy
            onApplyRequested: function(actionId) { messageRoot.applyActionRequested(actionId) }
            onRejectRequested: function(actionId) { messageRoot.rejectActionRequested(actionId) }
            onApplyAllRequested: messageRoot.applyAllRequested()
            onRejectAllRequested: messageRoot.rejectAllRequested()
        }
    }
}
