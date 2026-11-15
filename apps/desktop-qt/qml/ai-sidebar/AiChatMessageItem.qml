import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: chatItemRoot
    width: parent ? parent.width : 300
    Layout.fillWidth: true
    Layout.preferredHeight: contentCol.implicitHeight + 20
    radius: 12

    property string role: "user" // "user" or "assistant"
    property string messageText: ""
    property string timestamp: ""

    readonly property bool isUser: role === "user"

    color: isUser ? "#268b5cf6" : "#161524"
    border.color: isUser ? "#8b5cf6" : "#2e2b44"
    border.width: 1

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        anchors.margins: 12
        spacing: 6

        // Role & time header
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text {
                text: chatItemRoot.isUser ? "Você" : "Synapse AI"
                color: chatItemRoot.isUser ? "#c4b5fd" : "#34d399"
                font.pixelSize: 11
                font.bold: true
            }

            Item { Layout.fillWidth: true }

            Text {
                text: chatItemRoot.timestamp
                color: "#6b7280"
                font.pixelSize: 10
            }
        }

        // Message text
        TextEdit {
            Layout.fillWidth: true
            text: chatItemRoot.messageText
            color: "#fffffe"
            font.pixelSize: 13
            wrapMode: TextEdit.Wrap
            readOnly: true
            selectByMouse: true
            textFormat: TextEdit.AutoText
        }
    }
}
