pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: actionsRoot
    objectName: "notesRichPageReferenceActions"

    property var editorRoot
    property var textEditor
    property var textOperations
    property var commitTimer
    property var pageList: []

    signal pagePreviewRequested(string pageId)
    signal externalLinkRequested(string link)
    signal contentModified()

    function hasActivePage(pageId) {
        for (var index = 0; index < pageList.length; ++index) {
            if (String(pageList[index].id || "") === pageId) return true
        }
        return false
    }

    function selectedReference() {
        if (textEditor.selectionStart === textEditor.selectionEnd) return null
        var reference = textOperations.richPageReferenceAt(
                    textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd, false)
        return reference && Number(reference.end) === Number(reference.start) + 1 ? reference : null
    }

    function markContentModified() {
        editorRoot.hasEditedSinceLoad = true
        editorRoot.hasPendingChanges = true
        commitTimer.restart()
        contentModified()
    }

    function removeSelectedReference(reference) {
        var nextPosition = textOperations.replaceRichPageReferenceText(
                    textEditor.textDocument, reference.start, reference.end, "")
        if (nextPosition < 0) return false
        textEditor.cursorPosition = nextPosition
        markContentModified()
        return true
    }

    function handleKey(event) {
        var commandModifier = (event.modifiers & (Qt.ControlModifier | Qt.MetaModifier)) !== 0
        var shiftModifier = (event.modifiers & Qt.ShiftModifier) !== 0
        var pasteShortcut = (commandModifier && event.key === Qt.Key_V) ||
                (event.key === Qt.Key_Insert && shiftModifier)
        if (pasteShortcut) {
            var pastedPosition = textOperations.pasteRichPageReference(
                        textEditor.textDocument, textEditor.selectionStart,
                        textEditor.selectionEnd, pageList)
            if (pastedPosition >= 0) {
                textEditor.cursorPosition = pastedPosition
                markContentModified()
                event.accepted = true
                return true
            }
        }
        var reference = selectedReference()
        if (reference && commandModifier && event.key === Qt.Key_C) {
            if (!textOperations.copyRichPageReference(
                    textEditor.textDocument, reference.start, reference.end)) return false
            event.accepted = true
            return true
        }
        if (reference && ((commandModifier && event.key === Qt.Key_X) ||
                          (event.key === Qt.Key_Delete && shiftModifier))) {
            if (!textOperations.copyRichPageReference(
                    textEditor.textDocument, reference.start, reference.end) ||
                !removeSelectedReference(reference)) return false
            event.accepted = true
            return true
        }
        if (reference && pasteShortcut) {
            if (!removeSelectedReference(reference)) {
                event.accepted = true
                return true
            }
            return false
        }

        if (event.key === Qt.Key_Backspace || event.key === Qt.Key_Delete) {
            var preferPrevious = event.key === Qt.Key_Backspace
            reference = textOperations.richPageReferenceAt(
                        textEditor.textDocument, textEditor.selectionStart,
                        textEditor.selectionEnd, preferPrevious)
            if (!reference || Number(reference.end) <= Number(reference.start)) return false
            referenceDialog.openForRemoval(reference, Boolean(reference.deleted))
            event.accepted = true
            return true
        }

        var hasPrintableText = Boolean(event.text) && !/[\u0000-\u001f\u007f]/.test(event.text)
        if (commandModifier || (event.modifiers & Qt.AltModifier) !== 0 || !hasPrintableText ||
                textEditor.selectionStart === textEditor.selectionEnd) return false

        var selectedNodeReference = textOperations.richPageReferenceAt(
                    textEditor.textDocument, textEditor.selectionStart, textEditor.selectionEnd, false)
        if (!selectedNodeReference || Number(selectedNodeReference.end) !== Number(selectedNodeReference.start) + 1)
            return false
        var nextPosition = textOperations.replaceRichPageReferenceText(
                    textEditor.textDocument, selectedNodeReference.start,
                    selectedNodeReference.end, event.text)
        if (nextPosition < 0) return false
        textEditor.cursorPosition = nextPosition
        markContentModified()
        event.accepted = true
        return true
    }

    function activateReference(reference) {
        var pageId = String(reference.pageId || "")
        if (pageId.length === 0) return false
        if (hasActivePage(pageId)) {
            pagePreviewRequested(pageId)
            return true
        }
        referenceDialog.openForRemoval(reference, true)
        return true
    }

    function activateAtPosition(position) {
        var reference = textOperations.richPageReferenceAt(
                    textEditor.textDocument, position, position, false)
        if (!reference || Number(reference.end) <= Number(reference.start)) {
            reference = textOperations.richPageReferenceAt(
                        textEditor.textDocument, position, position, true)
        }
        if (!reference || Number(reference.end) <= Number(reference.start)) return false
        textEditor.select(Number(reference.start), Number(reference.end))
        return activateReference(reference)
    }

    function activateLink(link) {
        var pageId = textOperations.richPageReferenceId(link)
        if (!pageId) {
            externalLinkRequested(link)
            return true
        }
        var reference = textOperations.richPageReferenceRangeForHref(
                    textEditor.textDocument, link, textEditor.cursorPosition)
        if (!reference || Number(reference.end) <= Number(reference.start))
            reference = { pageId: pageId, title: pageId, start: -1, end: -1 }
        return activateReference(reference)
    }

    function removeReference(start, end) {
        if (!textOperations.removeRichPageReference(textEditor.textDocument, start, end)) return false
        textEditor.cursorPosition = start
        markContentModified()
        textEditor.forceActiveFocus()
        return true
    }

    Dialog {
        id: referenceDialog
        objectName: "notesPageReferenceRemovalDialog"
        modal: true
        anchors.centerIn: parent
        width: Math.min(parent.width - 32, 380)
        padding: 0
        closePolicy: Popup.CloseOnEscape
        standardButtons: Dialog.NoButton

        property string pageTitle: ""
        property int referenceStart: -1
        property int referenceEnd: -1
        property bool deletedTarget: false
        property bool removable: false

        function openForRemoval(reference, isDeleted) {
            pageTitle = String(reference.title || reference.pageId || "")
            referenceStart = Number(reference.start)
            referenceEnd = Number(reference.end)
            deletedTarget = isDeleted
            removable = referenceStart >= 0 && referenceEnd > referenceStart
            open()
        }

        background: Rectangle {
            color: "#1a1924"
            radius: 14
            border.color: referenceDialog.deletedTarget ? "#66ef4444" : "#18ffffff"
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
                    text: referenceDialog.deletedTarget ? qsTr("Deleted page reference") : qsTr("Remove page reference")
                    color: referenceDialog.deletedTarget ? "#fda4af" : "#fffffe"
                    font.pixelSize: 14
                    font.bold: true
                }
                ToolButton {
                    text: "×"
                    Accessible.name: qsTr("Close page reference dialog")
                    onClicked: referenceDialog.close()
                }
            }
        }

        contentItem: Label {
            padding: 18
            wrapMode: Text.Wrap
            color: "#a7a9be"
            text: referenceDialog.deletedTarget
                ? qsTr("The page ‘%1’ was deleted or moved to Trash. Keep this reference or remove it from the note?").arg(referenceDialog.pageTitle)
                : qsTr("Remove the reference to ‘%1’ from this note?").arg(referenceDialog.pageTitle)
        }

        footer: RowLayout {
            implicitHeight: 58
            spacing: 8
            Item { Layout.fillWidth: true }
            Button {
                objectName: "notesPageReferenceKeepButton"
                text: referenceDialog.deletedTarget ? qsTr("Keep reference") : qsTr("Cancel")
                onClicked: referenceDialog.close()
            }
            Button {
                id: removeReferenceButton
                objectName: "notesPageReferenceRemoveButton"
                text: referenceDialog.deletedTarget ? qsTr("Remove reference") : qsTr("Remove")
                enabled: referenceDialog.removable
                onClicked: {
                    if (actionsRoot.removeReference(referenceDialog.referenceStart, referenceDialog.referenceEnd))
                        referenceDialog.close()
                }
                background: Rectangle {
                    color: removeReferenceButton.enabled
                        ? (removeReferenceButton.down ? "#be123c" : "#e11d48") : "#343344"
                    radius: 8
                }
                contentItem: Label {
                    text: removeReferenceButton.text
                    color: "#fffffe"
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                    leftPadding: 8
                    rightPadding: 8
                }
            }
            Item { Layout.preferredWidth: 8 }
        }
    }
}
