import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesColorUtils.js" as NotesColorUtils
import "../ui"

Rectangle {
    id: fileWidgetRoot
    Layout.fillWidth: true
    implicitHeight: Math.max(44, attachmentContent.implicitHeight + 12)
    radius: 8

    property var blockData: ({})
    property var controller: null
    property var attrs: blockData.attrs || ({})
    property string fileId: attrs["data-file-id"] || attrs["file-id"] || attrs["fileId"] || ""
    property string fileName: attrs["data-name"] || attrs["name"] || attrs["data-file-name"] || attrs["file-name"] || qsTr("Arquivo")
    property string fileType: (attrs["data-file-type"] || attrs["file-type"] || attrs["fileType"] || "other").toLowerCase()
    property bool isLink: (attrs["data-is-link"] || attrs["isLink"] || "false") === "true"
    property int fileSize: parseInt(attrs["data-file-size"] || attrs["file-size"] || "0", 10) || 0
    property bool hasDriveCopy: false
    property string accentColor: attrs["data-color"] || attrs["color"] || "default"
    property bool renaming: false
    property bool showColorPicker: false
    property bool isDeleteDialogOpen: false
    property bool isMissingDialogOpen: false
    property bool isSyncingAttributesFromCore: false
    property bool isNotFound: false
    property bool isSelected: false
    property string renameErrorMessage: ""
    readonly property bool hasActionFocus: actionBar.hasActionFocus

    readonly property bool hasCustomColor: accentColor.length > 0 && accentColor !== "default" && !isNotFound
    readonly property color selectionRingColor: isNotFound
        ? "#ef444480"
        : (hasCustomColor ? NotesColorUtils.withHexAlpha(accentColor, "80") : "#a78bfa")

    color: isNotFound
        ? (hoverHandler.hovered ? "#33ef4444" : "#1aef4444")
        : (hasCustomColor
            ? NotesColorUtils.withHexAlpha(accentColor, "18")
            : (isLink
                ? (hoverHandler.hovered ? "#333b82f6" : "#1a3b82f6")
                : (hoverHandler.hovered ? "#338b5cf6" : "#1a8b5cf6")))
    border.color: isNotFound
        ? (isSelected ? "#ef4444" : (hoverHandler.hovered ? "#b3ef4444" : "#66ef4444"))
        : (hasCustomColor
            ? (isSelected ? accentColor : (hoverHandler.hovered ? accentColor : NotesColorUtils.withHexAlpha(accentColor, "60")))
            : (isSelected ? "#a78bfa" : (isLink ? "#333b82f6" : "#338b5cf6")))
    border.width: 1
    Behavior on color { ColorAnimation { duration: 150 } }
    Behavior on border.color { ColorAnimation { duration: 150 } }

    signal attrsUpdated(var newAttrs)
    signal previewFileRequested(string fileId, string fileName, bool showOpenActions, bool playAudio, bool openFolder)
    signal removeRequested()
    signal deleteLocalRequested(string fileId)

    HoverHandler { id: hoverHandler }

    FileAttachmentKeyboardActions {
        anchors.fill: parent
        selected: fileWidgetRoot.isSelected
        shortcutsBlocked: fileWidgetRoot.renaming || fileWidgetRoot.showColorPicker ||
            fileWidgetRoot.isDeleteDialogOpen || fileWidgetRoot.isMissingDialogOpen ||
            fileWidgetRoot.hasActionFocus || deleteAttachmentButton.activeFocus
        onDeleteRequested: fileWidgetRoot.requestDeleteConfirmation()
    }

    Rectangle {
        anchors.fill: parent
        anchors.margins: -2
        radius: fileWidgetRoot.radius + 2
        color: "transparent"
        border.color: fileWidgetRoot.selectionRingColor
        border.width: 2
        visible: fileWidgetRoot.isSelected
        enabled: false
        z: 2
    }

    function syncFromCore() {
        if (!fileId) {
            isNotFound = true
            return
        }

        var c = fileWidgetRoot.controller
        if (!c || typeof c.getFileWidgetMetadata !== "function") return
        var found = c.getFileWidgetMetadata(fileId)
        if (!found || !found.id) {
            isNotFound = true
            hasDriveCopy = false
            return
        }
        isNotFound = false
        hasDriveCopy = Boolean(found.has_drive_copy)
        var resolvedName = String(found.name || "")
        if (resolvedName.length > 0) {
            if (fileName !== resolvedName) fileName = resolvedName
            var storedName = String(attrs["data-name"] || attrs["name"] ||
                                    attrs["data-file-name"] || attrs["file-name"] || "")
            if (!renaming && storedName !== resolvedName) {
                var nextAttrs = Object.assign({}, attrs)
                nextAttrs["data-name"] = resolvedName
                nextAttrs["data-file-name"] = resolvedName
                isSyncingAttributesFromCore = true
                try {
                    attrsUpdated(nextAttrs)
                } finally {
                    isSyncingAttributesFromCore = false
                }
            }
        }
        if (found.file_type) fileType = String(found.file_type).toLowerCase()
        if (found.file_size !== undefined) fileSize = Number(found.file_size) || 0
    }

    function commitAttr(key, value) {
        var next = Object.assign({}, attrs)
        next[key] = value
        attrsUpdated(next)
    }

    function startRename() {
        if (isNotFound || renaming) return
        renameErrorMessage = ""
        renaming = true
        renameEditor.beginRename(fileName)
    }

    function commitRename(nextName) {
        var trimmed = String(nextName || "").trim()
        if (trimmed.length === 0 || trimmed === fileName) {
            renameErrorMessage = ""
            renaming = false
            return
        }
        var c = controller
        if (!fileId || !c || typeof c.renameFile !== "function" || !c.renameFile(fileId, trimmed)) {
            renameErrorMessage = qsTr("Não foi possível renomear o arquivo. Tente novamente.")
            renameEditor.focusInput()
            return
        }
        renameErrorMessage = ""
        fileName = trimmed
        var next = Object.assign({}, attrs)
        next["data-name"] = trimmed
        next["data-file-name"] = trimmed
        attrsUpdated(next)
        renaming = false
    }

    function requestDeleteConfirmation() {
        deleteDialog.errorMessage = ""
        isDeleteDialogOpen = true
    }

    function showRemovalError(message) {
        var errorText = String(message || qsTr("Não foi possível atualizar esta nota."))
        if (isMissingDialogOpen) {
            missingDialog.errorMessage = errorText
        } else {
            deleteDialog.errorMessage = errorText
            isDeleteDialogOpen = true
        }
    }

    function openFilePreview() {
        if (renaming) return
        if (isNotFound) {
            missingDialog.errorMessage = ""
            isMissingDialogOpen = true
            return
        }
        var isAudioFile = fileType === "audio" || /\.(mp3|wav|ogg|m4a|aac)$/i.test(fileName)
        var opensDocumentActions = fileType === "pdf" || fileType === "epub"
        previewFileRequested(fileId, fileName, opensDocumentActions, isAudioFile, fileType === "folder")
    }

    Component.onCompleted: syncFromCore()
    onBlockDataChanged: {
        if (!isSyncingAttributesFromCore) syncFromCore()
    }

    Connections {
        target: fileWidgetRoot.controller
        ignoreUnknownSignals: true
        function onFilesChanged() { fileWidgetRoot.syncFromCore() }
    }

    MouseArea {
        anchors.fill: parent
        cursorShape: Qt.PointingHandCursor
        onClicked: fileWidgetRoot.openFilePreview()
    }

    RowLayout {
        id: attachmentContent
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 8
        spacing: 8

        FileAttachmentIdentity {
            fileName: fileWidgetRoot.fileName
            fileType: fileWidgetRoot.fileType
            isMissing: fileWidgetRoot.isNotFound
            isRenaming: fileWidgetRoot.renaming
            pointerHovered: hoverHandler.hovered
            onPreviewRequested: fileWidgetRoot.openFilePreview()
            onRenameRequested: fileWidgetRoot.startRename()
        }

        FileAttachmentRenameEditor {
            id: renameEditor
            editing: fileWidgetRoot.renaming
            errorMessage: fileWidgetRoot.renameErrorMessage
            onRenameRequested: function(nextName) { fileWidgetRoot.commitRename(nextName) }
            onCancelRequested: {
                fileWidgetRoot.renameErrorMessage = ""
                fileWidgetRoot.renaming = false
            }
            onErrorCleared: fileWidgetRoot.renameErrorMessage = ""
        }

        FileAttachmentActionBar {
            id: actionBar
            pointerHovered: hoverHandler.hovered
            colorPickerOpen: fileWidgetRoot.showColorPicker
            renaming: fileWidgetRoot.renaming
            isMissing: fileWidgetRoot.isNotFound
            onRenameRequested: fileWidgetRoot.startRename()
            onColorPickerToggled: fileWidgetRoot.showColorPicker = !fileWidgetRoot.showColorPicker
        }

        ToolButton {
            id: deleteAttachmentButton
            Layout.preferredWidth: 24
            Layout.preferredHeight: 24
            focusPolicy: Qt.TabFocus
            Accessible.name: qsTr("Remover anexo desta nota")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Remover anexo")
            onClicked: fileWidgetRoot.requestDeleteConfirmation()
            background: Rectangle {
                radius: 6
                color: deleteAttachmentButton.hovered || deleteAttachmentButton.activeFocus ? "#33000000" : "transparent"
                border.color: deleteAttachmentButton.activeFocus ? "#998b5cf6" : "transparent"
                border.width: deleteAttachmentButton.activeFocus ? 1 : 0
            }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "close"
                color: deleteAttachmentButton.hovered ? "#f87171" : "#a7a9be"
                width: 14
                height: 14
            }
        }
    }

    NotesWidgetColorPalette {
        anchorItem: actionBar.colorAnchorItem
        isOpen: fileWidgetRoot.showColorPicker
        currentColor: fileWidgetRoot.accentColor
        onColorSelected: function(nextColor) {
            fileWidgetRoot.accentColor = nextColor
            fileWidgetRoot.showColorPicker = false
            fileWidgetRoot.commitAttr("data-color", nextColor)
        }
        onDismissed: fileWidgetRoot.showColorPicker = false
    }

    FileAttachmentDeleteDialog {
        id: deleteDialog
        isOpen: fileWidgetRoot.isDeleteDialogOpen
        fileName: fileWidgetRoot.fileName
        fileExists: !fileWidgetRoot.isNotFound
        hasDriveCopy: fileWidgetRoot.hasDriveCopy
        onUnlinkConfirmed: {
            fileWidgetRoot.isDeleteDialogOpen = false
            fileWidgetRoot.removeRequested()
        }
        onDeleteLocalConfirmed: {
            fileWidgetRoot.isDeleteDialogOpen = false
            fileWidgetRoot.deleteLocalRequested(fileWidgetRoot.fileId)
        }
        onDismissed: {
            fileWidgetRoot.isDeleteDialogOpen = false
            deleteDialog.errorMessage = ""
        }
    }

    FileAttachmentMissingDialog {
        id: missingDialog
        isOpen: fileWidgetRoot.isMissingDialogOpen
        fileName: fileWidgetRoot.fileName
        onRemoveWidgetRequested: fileWidgetRoot.removeRequested()
        onDismissed: fileWidgetRoot.isMissingDialogOpen = false
    }
}
