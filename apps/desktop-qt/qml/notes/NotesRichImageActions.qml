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
    property int savedStart: -1
    property int savedEnd: -1
    property string savedPageId: ""
    property string savedDocumentSource: ""
    property var imageState: ({ valid: false, position: -1, alignment: "center", caption: "" })
    readonly property bool canMoveUp: active && imageState.valid && textOperations && textEditor
        ? textOperations.canMoveRichImage(textEditor.textDocument, imageState.position, true) : false
    readonly property bool canMoveDown: active && imageState.valid && textOperations && textEditor
        ? textOperations.canMoveRichImage(textEditor.textDocument, imageState.position, false) : false
    property var imageCaptionItems: []
    property string captionDraft: ""
    property alias errorMessage: imageStatus.message

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
            showError(qsTr("The editor is too narrow to fit this image."))
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

    function showError(message) {
        imageStatus.show(message)
    }

    function openForPosition() {
        if (!active || !textEditor || !textOperations || !controller || controller.fileOperationRunning) {
            showError(qsTr("Wait for the current file operation to finish."))
            return false
        }
        savedStart = Math.min(Number(textEditor.selectionStart), Number(textEditor.selectionEnd))
        savedEnd = Math.max(Number(textEditor.selectionStart), Number(textEditor.selectionEnd))
        savedPageId = String(pageId)
        savedDocumentSource = String(textEditor.text)
        if (!textOperations.canInsertRichImage(textEditor.textDocument, savedStart)) {
            showError(qsTr("Place the caret in a regular paragraph before inserting an image."))
            return false
        }
        errorMessage = ""
        imageFileDialog.open()
        return true
    }

    function insertPreparedImage(result, start, end) {
        if (!result || !result.success || !textEditor || !textOperations) {
            showError(result && result.error ? result.error : qsTr("The image could not be inserted."))
            return false
        }
        if (String(pageId) !== savedPageId || String(textEditor.text) !== savedDocumentSource) {
            showError(qsTr("The note changed while the image was being prepared. Choose the image again."))
            return false
        }
        var naturalWidth = Number(result.width)
        var naturalHeight = Number(result.height)
        var dataUrl = String(result.imageDataUrl || "")
        if (naturalWidth <= 0 || naturalHeight <= 0 || dataUrl.length === 0) {
            showError(qsTr("The selected image is incomplete."))
            return false
        }
        var displayWidth = Math.min(720, naturalWidth)
        var displayHeight = Math.max(1, Math.round(naturalHeight * displayWidth / naturalWidth))
        var altText = String(result.fileName || "").trim()
        var insertionPosition = textOperations.insertRichImage(
                    textEditor.textDocument, Number(start), Number(end), dataUrl,
                    altText, displayWidth, displayHeight)
        if (insertionPosition < 0) {
            showError(qsTr("The image could not be inserted at this position. Place the caret in a regular paragraph and try again."))
            return false
        }
        errorMessage = ""
        textEditor.cursorPosition = insertionPosition
        textEditor.forceActiveFocus()
        if (commitTimer) commitTimer.restart()
        contentModified()
        return true
    }

    Connections {
        target: imageActionsRoot.controller
        ignoreUnknownSignals: true
        function onFileOperationFinished(result) {
            if (String(result.operation || "") !== "notes-rich-image") return
            if (!result.success) {
                imageActionsRoot.showError(result.error || qsTr("The image could not be processed."))
                return
            }
            imageActionsRoot.insertPreparedImage(result, imageActionsRoot.savedStart, imageActionsRoot.savedEnd)
        }
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

    NotesRichImageImportDialog {
        id: imageFileDialog
        controller: imageActionsRoot.controller
        onImageSelected: function(fileUrl) {
            imageActionsRoot.controller.processNotesRichImage(fileUrl)
        }
        onControllerUnavailable: imageActionsRoot.showError(qsTr("Image import is unavailable."))
    }

    NotesRichImageStatusBanner {
        id: imageStatus
        anchors.fill: parent
        z: 20
    }
}
