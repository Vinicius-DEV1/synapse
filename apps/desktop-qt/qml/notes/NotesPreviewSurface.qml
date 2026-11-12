import QtQuick 2.15
import QtQuick.Layouts 1.15
import "NotesRichLinkPreviewRenderer.js" as NotesLinkPreviewRenderer

Rectangle {
    id: previewSurface
    property string sourceHtml: ""
    property string copiedLinkUrl: ""
    property var controller: null
    signal linkActivated(string link)

    Layout.fillWidth: true
    implicitHeight: Math.max(300, previewContentColumn.implicitHeight + 60)
    color: "transparent"

    ColumnLayout {
        id: previewContentColumn
        anchors.fill: parent
        spacing: 8
        Text {
            id: markdownDisplayArea
            objectName: "notesPageContentPreview"
            Layout.fillWidth: true
            text: NotesLinkPreviewRenderer.render(
                      previewSurface.sourceHtml, previewSurface.controller, previewSurface.copiedLinkUrl)
            textFormat: /<[a-z][^>]*>/i.test(previewSurface.sourceHtml || "") ? Text.RichText : Text.MarkdownText
            color: "#fffffe"
            font.pixelSize: 15
            font.family: "Inter, -apple-system, sans-serif"
            wrapMode: Text.Wrap
            lineHeight: 1.45
            onLinkActivated: function(link) { previewSurface.linkActivated(link) }
        }
        NotesLinkPreviewActionMenu {
            actions: NotesLinkPreviewRenderer.actionItems(
                         previewSurface.sourceHtml, previewSurface.controller, previewSurface.copiedLinkUrl)
            onActionActivated: function(link) { previewSurface.linkActivated(link) }
        }
    }
}
