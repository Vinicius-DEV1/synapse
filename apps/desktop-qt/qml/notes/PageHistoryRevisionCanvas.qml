import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: canvasRoot

    property int viewportWidth: 0
    property var selectedEntry: null
    property int selectedIndex: 0
    property string heading: ""
    property string subtitle: ""
    property string bodyText: ""
    property bool bodyIsRichText: false
    property bool decryptionFailed: false
    property string decryptionErrorText: ""

    signal externalLinkActivated(string link)

    Layout.fillWidth: true
    Layout.fillHeight: true
    color: "#0f0f11"

    ScrollView {
        id: historyContentScroll
        anchors.fill: parent
        contentWidth: availableWidth
        clip: true
        visible: canvasRoot.selectedEntry !== null

        ColumnLayout {
            objectName: "historyCanvasColumn"
            width: Math.max(0, Math.min(historyContentScroll.availableWidth, 768)
                            - (canvasRoot.viewportWidth >= 640 ? 96 : 48))
            x: Math.max(0, (historyContentScroll.availableWidth - width) / 2)
            spacing: 0

            Item { Layout.fillWidth: true; height: canvasRoot.viewportWidth >= 640 ? 64 : 40 }
            Text {
                Layout.fillWidth: true
                text: canvasRoot.heading
                color: theme.textDark
                font.pixelSize: 24
                font.bold: true
            }
            Text {
                Layout.fillWidth: true
                Layout.topMargin: 4
                text: canvasRoot.subtitle
                color: theme.textMuted
                font.pixelSize: 12
                font.family: theme.fontMono
                wrapMode: Text.Wrap
            }
            Rectangle {
                Layout.fillWidth: true
                Layout.topMargin: 16
                Layout.bottomMargin: 32
                height: 1
                color: "#0affffff"
            }
            Text {
                objectName: "historyDecryptionError"
                Layout.fillWidth: true
                visible: canvasRoot.decryptionFailed
                text: canvasRoot.decryptionErrorText
                color: "#fda4af"
                font.pixelSize: 14
                wrapMode: Text.Wrap
                Accessible.role: Accessible.AlertMessage
                Accessible.name: text
            }
            Text {
                objectName: "historyRevisionContent"
                Layout.fillWidth: true
                visible: !canvasRoot.decryptionFailed
                text: canvasRoot.bodyText
                textFormat: canvasRoot.bodyIsRichText ? Text.RichText : Text.MarkdownText
                color: "#e4e4e7"
                font.pixelSize: 16
                wrapMode: Text.Wrap
                lineHeight: 1.8
                lineHeightMode: Text.ProportionalHeight
                onLinkActivated: function(link) { canvasRoot.externalLinkActivated(link) }
            }
            Item { Layout.fillWidth: true; height: canvasRoot.viewportWidth >= 640 ? 64 : 40 }
        }
    }

    Text {
        anchors.centerIn: parent
        visible: canvasRoot.selectedEntry === null
        text: "Selecione uma revisão à esquerda"
        color: theme.textMuted
        font.pixelSize: 12
        font.family: theme.fontMono
    }
}
