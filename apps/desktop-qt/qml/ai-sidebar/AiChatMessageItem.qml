import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15
import "../ui"

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

    signal copyRequested(string text)
    signal insertIntoNoteRequested(string text)

    color: isUser ? "#268b5cf6" : "#161524"
    border.color: isUser ? "#8b5cf6" : "#2e2b44"
    border.width: 1

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        anchors.margins: 12
        spacing: 6

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text {
                text: chatItemRoot.isUser ? qsTr("Você") : "Synapse AI"
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

        RowLayout {
            visible: !chatItemRoot.isUser && chatItemRoot.messageText.length > 0
            Layout.fillWidth: true
            spacing: 6

            Button {
                Layout.preferredHeight: 24
                padding: 6
                onClicked: chatItemRoot.copyRequested(chatItemRoot.messageText)
                background: Rectangle { radius: 5; color: parent.hovered ? "#22ffffff" : "#12ffffff" }
                contentItem: Text { text: qsTr("Copiar"); color: "#cbd5e1"; font.pixelSize: 10 }
            }

            Button {
                Layout.preferredHeight: 24
                padding: 8
                onClicked: chatItemRoot.insertIntoNoteRequested(chatItemRoot.messageText)
                background: Rectangle { radius: 5; color: parent.hovered ? "#338b5cf6" : "#1f8b5cf6" }
                contentItem: Text { text: qsTr("Inserir na nota"); color: "#ddd6fe"; font.pixelSize: 10; font.weight: Font.Medium }
            }

            Item { Layout.fillWidth: true }
        }
    }
}
