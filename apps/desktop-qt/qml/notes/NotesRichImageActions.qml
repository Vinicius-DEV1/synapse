pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: imageActionsRoot
    objectName: "notesRichImageActions"

    property var textEditor
    property var textOperations
    property var controller
    property var commitTimer
    property string pageId: ""
    property bool active: false
    property alias savedStart: imageImportFlow.savedStart
    property alias savedEnd: imageImportFlow.savedEnd
    property alias savedPageId: imageImportFlow.savedPageId
    property alias savedDocumentSource: imageImportFlow.savedDocumentSource
    property var imageState: ({ valid: false, position: -1, alignment: "center", caption: "" })
    readonly property bool canMoveUp: active && imageState.valid && textOperations && textEditor
        ? textOperations.canMoveRichImage(textEditor.textDocument, imageState.position, true) : false
    readonly property bool canMoveDown: active && imageState.valid && textOperations && textEditor
        ? textOperations.canMoveRichImage(textEditor.textDocument, imageState.position, false) : false
    property var imageCaptionItems: []
    property string captionDraft: ""
    property alias errorMessage: imageImportFlow.errorMessage

    signal contentModified()

    function refreshImageState() {
        if (!active || !textEditor || !textOperations || !textEditor.textDocument) {
            imageState = { valid: false, position: -1, alignment: "center", caption: "" }
            imageCaptionItems = []
            return
        }
        var nextState = textOperations.richImageAt(textEditor.textDocument, textEditor.cursorPosition,
                                                   textEditor.selectionStart, textEditor.selectionEnd)
        imageState = nextState && nextState.valid
                ? nextState : { valid: false, position: -1, alignment: "center", caption: "" }
        imageCaptionItems = textOperations.richImageCaptions(textEditor.textDocument)
        if (!captionField.activeFocus) captionDraft = String(imageState.caption || "")
    }

    function setAlignment(alignment) {
        if (String(imageState.alignment || "center") === String(alignment)) return true
        if (!active || !imageState.valid || !textOperations.setRichImageAlignment(
                    textEditor.textDocument, imageState.position, alignment)) return false
        refreshImageState()
        textEditor.forceActiveFocus()
        if (commitTimer) commitTimer.restart()
        contentModified()
        return true
    }

    function commitCaption() {
        var nextCaption = String(captionDraft).trim()
        if (!imageState.valid || nextCaption === String(imageState.caption || "")) return false
        if (!imageState.valid || !textOperations.setRichImageCaption(
                    textEditor.textDocument, imageState.position, nextCaption)) return false
        captionDraft = nextCaption
        refreshImageState()
        if (commitTimer) commitTimer.restart()
        contentModified()
        return true
    }

    function commitSize(width, height) {
        if (!active || !imageState.valid) return false
        var hasWidth = Number(width) >= 0
        var hasHeight = Number(height) >= 0
        if (hasWidth === Boolean(imageState.hasWidth) &&
                hasHeight === Boolean(imageState.hasHeight) &&
                (!hasWidth || Number(imageState.width) === Number(width)) &&
                (!hasHeight || Number(imageState.height) === Number(height))) return true
        if (!textOperations.setRichImageSize(textEditor.textDocument, imageState.position,
                                             Number(width), Number(height))) return false
        refreshImageState()
        textEditor.forceActiveFocus()
        if (commitTimer) commitTimer.restart()
        contentModified()
        return true
    }

    function fitToWidth() {
        if (!imageState.valid || !textEditor) return false
        var targetWidth = Math.min(8192, Math.round(Number(textEditor.width)))
        if (targetWidth < 60) {
            imageImportFlow.showError(qsTr("The editor is too narrow to fit this image."))
            return false
        }
        return commitSize(targetWidth, -1)
    }

    function resetImageSize() {
        return commitSize(-1, -1)
    }

    function moveImage(upward) {
        if (!active || !imageState.valid || !textOperations || !textEditor ||
                !textOperations.canMoveRichImage(textEditor.textDocument, imageState.position, upward)) return false
        var movedPosition = textOperations.moveRichImage(
                    textEditor.textDocument, imageState.position, upward)
        if (movedPosition < 0) return false
        textEditor.cursorPosition = movedPosition
        textEditor.forceActiveFocus()
        refreshImageState()
        if (commitTimer) commitTimer.restart()
        contentModified()
        return true
    }

    function insertParagraphBelowImage() {
        if (!active || !imageState.valid || !textOperations || !textEditor) return false
        var paragraphPosition = textOperations.insertRichParagraphBelowImage(
                    textEditor.textDocument, imageState.position)
        if (paragraphPosition < 0) return false
        textEditor.cursorPosition = paragraphPosition
        textEditor.forceActiveFocus()
        refreshImageState()
        if (commitTimer) commitTimer.restart()
        contentModified()
        return true
    }

    function requestDelete() {
        return imageDeletion.requestDelete(imageState.valid ? imageState.position : -1)
    }

    function handleDeleteKey(key) {
        return imageDeletion.handleKey(key)
    }

    function openForPosition() {
        return imageImportFlow.openForPosition()
    }

    function pasteFromClipboard() {
        return imageImportFlow.pasteFromClipboard()
    }

    function importDroppedImage(fileUrl, position) {
        return imageImportFlow.importDroppedImage(fileUrl, position)
    }

    function importDroppedImages(fileUrls, position) {
        return imageImportFlow.importDroppedImages(fileUrls, position)
    }

    Connections {
        target: imageActionsRoot.textEditor
        function onCursorPositionChanged() { imageActionsRoot.refreshImageState() }
        function onSelectionStartChanged() { imageActionsRoot.refreshImageState() }
        function onSelectionEndChanged() { imageActionsRoot.refreshImageState() }
        function onTextChanged() { captionRefreshTimer.restart() }
    }

    Component.onCompleted: refreshImageState()
    onActiveChanged: refreshImageState()

    Timer {
        id: captionRefreshTimer
        interval: 60
        repeat: false
        onTriggered: imageActionsRoot.refreshImageState()
    }

    Repeater {
        model: imageActionsRoot.imageCaptionItems
        delegate: Text {
            required property var modelData
            objectName: "notesRichImageCaption_" + modelData.position
            readonly property rect imageRect: imageActionsRoot.textEditor.positionToRectangle(modelData.position)
            visible: imageActionsRoot.active && imageActionsRoot.imageState.position !== modelData.position
            x: Math.max(0, imageRect.x)
            y: imageRect.y + imageRect.height + 3
            width: Math.max(0, Math.min(Number(modelData.width), parent.width - x))
            text: modelData.caption
            color: "#a7a9be"
            font.pixelSize: 13
            font.italic: true
            horizontalAlignment: Text.AlignHCenter
            wrapMode: Text.Wrap
            z: 2
        }
    }

    TextField {
        id: captionField
        objectName: "notesRichImageCaptionInput"
        readonly property rect imageRect: imageActionsRoot.imageState.valid
            ? imageActionsRoot.textEditor.positionToRectangle(imageActionsRoot.imageState.position)
            : Qt.rect(0, 0, 0, 0)
        visible: imageActionsRoot.active && imageActionsRoot.imageState.valid && !imageResizeOverlay.resizing
        x: Math.max(0, imageRect.x)
        y: imageRect.y + imageRect.height + 1
        width: Math.max(120, Math.min(Number(imageActionsRoot.imageState.width || 240), parent.width - x))
        height: 29
        padding: 4
        text: imageActionsRoot.captionDraft
        placeholderText: qsTr("Write a caption…")
        horizontalAlignment: TextInput.AlignHCenter
        color: "#fffffe"
        selectByMouse: true
        Accessible.name: qsTr("Image caption")
        background: Rectangle {
            color: captionField.activeFocus ? "#201e2d" : "#10101a"
            border.color: captionField.activeFocus ? "#7c6fa8" : "#18ffffff"
            radius: 4
        }
        onTextEdited: imageActionsRoot.captionDraft = text
        onEditingFinished: imageActionsRoot.commitCaption()
        onActiveFocusChanged: if (!activeFocus && visible) imageActionsRoot.commitCaption()
        z: 3
    }

    NotesRichImageResizeOverlay {
        id: imageResizeOverlay
        anchors.fill: parent
        active: imageActionsRoot.active && imageActionsRoot.imageState.valid
        imageRect: active
            ? imageActionsRoot.textEditor.positionToRectangle(imageActionsRoot.imageState.position)
            : Qt.rect(0, 0, 0, 0)
        imageWidth: Number(imageActionsRoot.imageState.width || 0)
        imageHeight: Number(imageActionsRoot.imageState.height || 0)
        maximumWidth: Math.round(imageActionsRoot.textEditor ? imageActionsRoot.textEditor.width : 0)
        alignment: String(imageActionsRoot.imageState.alignment || "center")
        onResizeStarted: {
            imageSource = imageActionsRoot.textOperations.richImageData(
                              imageActionsRoot.textEditor.textDocument,
                              imageActionsRoot.imageState.position)
        }
        onResizeCommitted: function(width, height) {
            imageActionsRoot.commitSize(width, height)
        }
        onResetRequested: imageActionsRoot.resetImageSize()
        z: 4
    }

    NotesRichImageDeletion {
        id: imageDeletion
        anchors.fill: parent
        z: 30
        textEditor: imageActionsRoot.textEditor
        textOperations: imageActionsRoot.textOperations
        commitTimer: imageActionsRoot.commitTimer
        pageId: imageActionsRoot.pageId
        active: imageActionsRoot.active
        onContentModified: imageActionsRoot.contentModified()
    }

    NotesRichImageImportFlow {
        id: imageImportFlow
        anchors.fill: parent
        z: 20
        textEditor: imageActionsRoot.textEditor
        textOperations: imageActionsRoot.textOperations
        controller: imageActionsRoot.controller
        commitTimer: imageActionsRoot.commitTimer
        pageId: imageActionsRoot.pageId
        active: imageActionsRoot.active
        onContentModified: imageActionsRoot.contentModified()
    }

}
