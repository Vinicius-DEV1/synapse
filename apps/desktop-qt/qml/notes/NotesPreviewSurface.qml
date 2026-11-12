import QtQuick 2.15
import QtQuick.Layouts 1.15
import "NotesRichLinkPreviewRenderer.js" as NotesLinkPreviewRenderer
import "NotesRichLinkPreviewBlockEdits.js" as NotesLinkPreviewBlockEdits

Rectangle {
    id: previewSurface
    objectName: "notesPreviewSurface"
    property string sourceHtml: ""
    property string copiedLinkUrl: ""
    property var controller: null
    property var sourceEditor: null
    property var textOperations: null
    readonly property bool isDialogOpen: linkNotesDialog.visible || linkColorDialog.visible
    signal linkActivated(string link)
    signal actionFailed(string message)

    Layout.fillWidth: true
    implicitHeight: Math.max(300, previewContentColumn.implicitHeight + 60)
    color: "transparent"

    function openLinkNotes(url, start, notes) {
        linkNotesDialog.openForLink(url, start, notes)
    }

    function openLinkColor(url, start, color) {
        linkColorDialog.openForLink(url, start, color)
    }

    function replaceTextRange(start, end, replacement) {
        return sourceEditor && textOperations &&
                textOperations.replace(sourceEditor.textDocument, start, end, replacement)
    }

    function replaceStatusAttributes(source, url, watched, watching) {
        return NotesLinkPreviewBlockEdits.replaceStatusAttributes(source, url, watched, watching)
    }

    function replacePreviewWithText(source, url, start) {
        return NotesLinkPreviewBlockEdits.replacePreviewWithText(source, url, start)
    }

    function linkPreviewData(source, url, start, provider) {
        return NotesLinkPreviewBlockEdits.linkPreviewData(source, url, start, provider)
    }

    function replacePreviewAttributes(source, url, start, changes, provider) {
        return NotesLinkPreviewBlockEdits.replacePreviewAttributes(source, url, start, changes, provider)
    }

    function saveLinkNotes(url, start, notes) {
        if (!controller || typeof controller.setLinkEntityNotes !== "function" || !sourceEditor) {
            actionFailed(qsTr("Link notes are unavailable right now."))
            linkNotesDialog.finishSave(false)
            return false
        }
        var update = replacePreviewAttributes(
                    sourceEditor.text, url, start, {notes: notes, showNotes: true}, controller)
        if (!update.success) {
            actionFailed(qsTr("Could not find this saved link card."))
            linkNotesDialog.finishSave(false)
            return false
        }
        var saved = controller.setLinkEntityNotes(url, notes)
        if (!saved || saved.success !== true) {
            actionFailed(qsTr("Could not save the link notes."))
            linkNotesDialog.finishSave(false)
            return false
        }
        if (!replaceTextRange(update.start, update.end, update.replacement)) {
            actionFailed(qsTr("Link notes were saved, but the page card could not be updated."))
            linkNotesDialog.finishSave(false)
            return false
        }
        linkNotesDialog.finishSave(true)
        return true
    }

    function saveLinkColor(url, start, color) {
        if (!controller || typeof controller.setLinkEntityColor !== "function" || !sourceEditor) {
            actionFailed(qsTr("Link colors are unavailable right now."))
            linkColorDialog.finishSave(false)
            return false
        }
        var update = replacePreviewAttributes(
                    sourceEditor.text, url, start, {color: color}, controller)
        if (!update.success) {
            actionFailed(qsTr("Could not find this saved link card."))
            linkColorDialog.finishSave(false)
            return false
        }
        var saved = controller.setLinkEntityColor(url, color)
        if (!saved || saved.success !== true) {
            actionFailed(qsTr("Could not save the link color."))
            linkColorDialog.finishSave(false)
            return false
        }
        if (!replaceTextRange(update.start, update.end, update.replacement)) {
            actionFailed(qsTr("Link color was saved, but the page card could not be updated."))
            linkColorDialog.finishSave(false)
            return false
        }
        linkColorDialog.finishSave(true)
        return true
    }

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

    NotesLinkNotesDialog {
        id: linkNotesDialog
        onSaveRequested: function(url, start, notes) {
            previewSurface.saveLinkNotes(url, start, notes)
        }
    }

    NotesLinkColorDialog {
        id: linkColorDialog
        onColorSelected: function(url, start, color) {
            previewSurface.saveLinkColor(url, start, color)
        }
    }
}
