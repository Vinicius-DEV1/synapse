import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: blockquoteRoot
    Layout.fillWidth: true
    implicitHeight: quoteCol.implicitHeight + 20
    radius: 8
    color: "#181825"
    border.color: "#0affffff"
    border.width: 1

    property color accentColor: "#6366f1"
    property string title: "Nota Importante"
    property string content: "O Two-Tier Keychain protege as chaves das páginas e arquivos através da Master Key derivada com PBKDF2 (600.000 iterações)."

    Rectangle {
        anchors.left: parent.left
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        width: 4
        radius: 2
        color: blockquoteRoot.accentColor
    }

    ColumnLayout {
        id: quoteCol
        anchors.fill: parent
        anchors.leftMargin: 16
        anchors.rightMargin: 12
        anchors.topMargin: 10
        anchors.bottomMargin: 10
        spacing: 4

        Text {
            text: blockquoteRoot.title
            color: blockquoteRoot.accentColor
            font.pixelSize: 13
            font.bold: true
        }

        Text {
            Layout.fillWidth: true
            text: blockquoteRoot.content
            color: "#d4d4d8"
            font.pixelSize: 13
            wrapMode: Text.Wrap
            lineHeight: 1.35
        }
    }
}

