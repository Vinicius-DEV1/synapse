import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesRichLinkPreviewRenderer.js" as NotesLinkPreviewRenderer
import "NotesRichLinkPreviewBlockEdits.js" as NotesLinkPreviewBlockEdits
import "NotesCustomWidgetsRenderer.js" as NotesCustomWidgetsRenderer

Rectangle {
    id: previewSurface
    objectName: "notesPreviewSurface"
    property string sourceHtml: ""
    property string copiedLinkUrl: ""
    property var controller: null
    property var sourceEditor: null
    property var textOperations: null
    property var revealedSpoilers: ({})
    property var toggleStates: ({})
    readonly property bool isDialogOpen: linkNotesDialog.visible || linkColorDialog.visible || linkDeleteDialog.visible
    signal linkActivated(string link)
    signal actionFailed(string message)

    Layout.fillWidth: true
    implicitHeight: Math.max(300, previewContentColumn.implicitHeight + 60)
    color: "transparent"

    function toggleSpoiler(spoilerId) {
        var copy = Object.assign({}, revealedSpoilers)
        copy[spoilerId] = !copy[spoilerId]
        revealedSpoilers = copy
    }

    function toggleBlock(toggleId) {
        var copy = Object.assign({}, toggleStates)
        copy[toggleId] = (copy[toggleId] !== undefined) ? !copy[toggleId] : false
        toggleStates = copy
    }

    function handleCustomWidgetLink(link) {
        if (link.indexOf("synapse-spoiler://toggle?id=") === 0) {
            var spoilerId = link.substring("synapse-spoiler://toggle?id=".length)
            toggleSpoiler(spoilerId)
            return true
        }
        if (link.indexOf("synapse-toggle://toggle?id=") === 0) {
            var toggleId = link.substring("synapse-toggle://toggle?id=".length)
            toggleBlock(toggleId)
            return true
        }
        return false
    }

    function openLinkNotes(url, start, notes) {
        linkNotesDialog.openForLink(url, start, notes)
    }

    function openLinkColor(url, start, color) {
        linkColorDialog.openForLink(url, start, color)
    }

    function openLinkDeleteConfirm(url, start) {
        linkDeleteDialog.openForDeletion(url, start)
    }

    function removePreviewBlock(source, url, start) {
        return NotesLinkPreviewBlockEdits.removePreviewBlock(source, url, start)
    }

    function deleteLinkCard(url, start) {
        if (!sourceEditor) {
            actionFailed(qsTr("Editor is not ready."))
            return false
        }
        var update = removePreviewBlock(sourceEditor.text, url, start)
        if (!update.success) {
            actionFailed(qsTr("Could not find this saved link card."))
            return false
        }
        if (!replaceTextRange(update.start, update.end, update.replacement)) {
            actionFailed(qsTr("Could not remove the link card."))
            return false
        }
        return true
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
            text: NotesCustomWidgetsRenderer.renderCustomWidgets(
                      NotesLinkPreviewRenderer.render(
                          previewSurface.sourceHtml, previewSurface.controller, previewSurface.copiedLinkUrl),
                      { revealedSpoilers: previewSurface.revealedSpoilers, toggleStates: previewSurface.toggleStates })
            textFormat: /<[a-z][^>]*>/i.test(previewSurface.sourceHtml || "") ? Text.RichText : Text.MarkdownText
            color: "#fffffe"
            font.pixelSize: 15
            font.family: "Inter, -apple-system, sans-serif"
            wrapMode: Text.Wrap
            lineHeight: 1.45
            onLinkActivated: function(link) {
                if (!previewSurface.handleCustomWidgetLink(link)) {
                    previewSurface.linkActivated(link)
                }
            }
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

    Dialog {
        id: linkDeleteDialog
        objectName: "notesLinkDeleteDialog"
        modal: true
        anchors.centerIn: parent
        width: Math.min(parent.width - 32, 380)
        padding: 0
        closePolicy: Popup.CloseOnEscape
        standardButtons: Dialog.NoButton

        property string deleteUrl: ""
        property int deleteStart: -1

        function openForDeletion(url, start) {
            deleteUrl = String(url || "")
            deleteStart = Number(start)
            open()
        }

        background: Rectangle {
            color: "#1a1924"
            radius: 14
            border.color: "#66ef4444"
        }

        header: Rectangle {
            implicitHeight: 58
            color: "#08ffffff"
            radius: 14
            Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: "#0cffffff" }
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 18
                anchors.rightMargin: 10
                Label {
                    Layout.fillWidth: true
                    text: qsTr("Remove Link")
                    color: "#fda4af"
                    font.pixelSize: 14
                    font.bold: true
                }
                ToolButton {
                    text: "×"
                    Accessible.name: qsTr("Close remove link dialog")
                    onClicked: linkDeleteDialog.close()
                }
            }
        }

        contentItem: Label {
            padding: 18
            wrapMode: Text.Wrap
            color: "#a7a9be"
            text: qsTr("Are you sure you want to remove this link card from the document?")
        }

        footer: RowLayout {
            implicitHeight: 58
            spacing: 8
            Item { Layout.fillWidth: true }
            Button {
                objectName: "notesLinkDeleteCancelButton"
                text: qsTr("Cancel")
                onClicked: linkDeleteDialog.close()
            }
            Button {
                id: confirmDeleteButton
                objectName: "notesLinkDeleteConfirmButton"
                text: qsTr("Remove")
                onClicked: {
                    if (previewSurface.deleteLinkCard(linkDeleteDialog.deleteUrl, linkDeleteDialog.deleteStart)) {
                        linkDeleteDialog.close()
                    }
                }
                background: Rectangle {
                    color: confirmDeleteButton.down ? "#b91c1c" : (confirmDeleteButton.hovered ? "#dc2626" : "#ef4444")
                    radius: 8
                }
                contentItem: Text {
                    text: confirmDeleteButton.text
                    color: "#fffffe"
                    font.weight: Font.Medium
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
            Item { Layout.preferredWidth: 10 }
        }
    }
}
