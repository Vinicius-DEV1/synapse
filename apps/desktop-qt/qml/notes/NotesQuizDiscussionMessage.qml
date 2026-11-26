import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: messageRoot
    property string role: "assistant"
    property string bodyText: ""
    readonly property bool isUserMessage: role === "user"

    Layout.alignment: isUserMessage ? Qt.AlignRight : Qt.AlignLeft
    Layout.maximumWidth: parent.width * 0.92
    width: Math.min(parent.width * 0.92, Math.max(180, messageText.implicitWidth + 32))
    implicitHeight: messageText.implicitHeight + 28
    radius: 16
    color: isUserMessage ? "#7c3aed" : "#201b2c"
    border.color: isUserMessage ? "#8b5cf6" : "#4c1d95"

    Text {
        id: messageText
        anchors.fill: parent
        anchors.margins: 14
        text: messageRoot.bodyText
        textFormat: Text.MarkdownText
        color: messageRoot.isUserMessage ? "#ffffff" : "#f3e8ff"
        font.pixelSize: 12
        wrapMode: Text.Wrap
        linkColor: "#c4b5fd"
    }
}
