import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: fileWidgetRoot
    Layout.fillWidth: true
    implicitHeight: 42
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
    property string renameErrorMessage: ""

    readonly property bool hasCustomColor: accentColor.length > 0 && accentColor !== "default" && !isNotFound

    color: isNotFound
        ? (hoverHandler.hovered ? "#33ef4444" : "#1aef4444")
        : (hasCustomColor
            ? (accentColor + "18")
            : (isLink
                ? (hoverHandler.hovered ? "#333b82f6" : "#1a3b82f6")
                : (hoverHandler.hovered ? "#338b5cf6" : "#1a8b5cf6")))
    border.color: isNotFound
        ? (hoverHandler.hovered ? "#b3ef4444" : "#66ef4444")
        : (hasCustomColor
            ? (hoverHandler.hovered ? accentColor : (accentColor + "60"))
            : (isLink ? "#333b82f6" : "#338b5cf6"))
    border.width: 1
    Behavior on color { ColorAnimation { duration: 150 } }
    Behavior on border.color { ColorAnimation { duration: 150 } }

    signal attrsUpdated(var newAttrs)
    signal previewFileRequested(string fileId, string fileName)
    signal removeRequested()
    signal deleteLocalRequested(string fileId)

    HoverHandler { id: hoverHandler }

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
        previewFileRequested(fileId, fileName)
    }

    function iconNameForType() {
        if (isNotFound) return "alert"
        if (fileType === "pdf" || fileType === "document" || fileType === "doc") return "file-text"
        if (fileType.indexOf("image") >= 0 || fileType === "png" || fileType === "jpg") return "image"
        if (fileType.indexOf("video") >= 0 || fileType === "mp4") return "film"
        if (fileType === "folder") return "folder"
        return "files"
    }

    function iconColorForType() {
        if (isNotFound) return "#f87171"
        if (fileType === "pdf" || fileType === "document" || fileType === "doc") return "#60a5fa"
        if (fileType.indexOf("image") >= 0 || fileType === "png" || fileType === "jpg") return "#4ade80"
        if (fileType.indexOf("video") >= 0 || fileType === "mp4") return "#c084fc"
        if (fileType === "folder") return "#facc15"
        return "#a78bfa"
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
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 8
        spacing: 8

        // Icon container: p-2 bg-dark-bg rounded-lg border border-white/5 mr-1
        Rectangle {
            Layout.preferredWidth: 30
            Layout.preferredHeight: 30
            radius: 8
            color: "#0f0e17"
            border.color: "#0dffffff"
            border.width: 1
            AppIcon {
                anchors.centerIn: parent
                name: fileWidgetRoot.iconNameForType()
                color: fileWidgetRoot.iconColorForType()
                width: 16
                height: 16
            }
        }

        // Inline rename input
        RowLayout {
            visible: fileWidgetRoot.renaming
            Layout.fillWidth: true
            spacing: 4

            TextField {
                id: nameInput
                Layout.preferredWidth: 220
                Layout.preferredHeight: 26
                text: fileWidgetRoot.fileName
                color: "#fffffe"
                font.pixelSize: 12
                font.weight: Font.Medium
                leftPadding: 6
                rightPadding: 6
                Accessible.description: fileWidgetRoot.renameErrorMessage
                ToolTip.visible: fileWidgetRoot.renameErrorMessage.length > 0
                ToolTip.text: fileWidgetRoot.renameErrorMessage
                ToolTip.timeout: -1
                onTextEdited: fileWidgetRoot.renameErrorMessage = ""
                background: Rectangle {
                    radius: 4
                    color: "#66000000"
                    border.color: "#cc8b5cf6"
                    border.width: 1
                }
                onAccepted: {
                    var trimmed = text.trim()
                    if (trimmed.length === 0 || trimmed === fileWidgetRoot.fileName) {
                        fileWidgetRoot.renameErrorMessage = ""
                        fileWidgetRoot.renaming = false
                        return
                    }
                    var c = fileWidgetRoot.controller
                    if (!fileWidgetRoot.fileId || !c || typeof c.renameFile !== "function" ||
                            !c.renameFile(fileWidgetRoot.fileId, trimmed)) {
                        fileWidgetRoot.renameErrorMessage = qsTr("Não foi possível renomear o arquivo. Tente novamente.")
                        nameInput.forceActiveFocus()
                        return
                    }
                    fileWidgetRoot.renameErrorMessage = ""
                    fileWidgetRoot.fileName = trimmed
                    var next = Object.assign({}, fileWidgetRoot.attrs)
                    next["data-name"] = trimmed
                    next["data-file-name"] = trimmed
                    fileWidgetRoot.attrsUpdated(next)
                    fileWidgetRoot.renaming = false
                }
                Keys.onEscapePressed: {
                    fileWidgetRoot.renameErrorMessage = ""
                    fileWidgetRoot.renaming = false
                }
            }

            ToolButton {
                id: renameConfirmButton
                Layout.preferredWidth: 22
                Layout.preferredHeight: 22
                focusPolicy: Qt.NoFocus
                onClicked: nameInput.accepted()
                background: Rectangle { radius: 4; color: renameConfirmButton.hovered ? "#3310b981" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "check"; color: "#34d399"; width: 13; height: 13 }
            }

            ToolButton {
                id: renameCancelButton
                Layout.preferredWidth: 22
                Layout.preferredHeight: 22
                focusPolicy: Qt.NoFocus
                onClicked: {
                    fileWidgetRoot.renameErrorMessage = ""
                    fileWidgetRoot.renaming = false
                }
                background: Rectangle { radius: 4; color: renameCancelButton.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#a7a9be"; width: 12; height: 12 }
            }
        }

        // File title
        Text {
            visible: !fileWidgetRoot.renaming
            Layout.fillWidth: true
            text: fileWidgetRoot.fileName + (fileWidgetRoot.isNotFound ? qsTr(" (Excluído)") : "")
            color: fileWidgetRoot.isNotFound ? "#f87171" : (hoverHandler.hovered ? "#ffffff" : "#fffffe")
            font.pixelSize: 13
            font.weight: Font.Medium
            elide: Text.ElideRight

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: fileWidgetRoot.openFilePreview()
                onDoubleClicked: {
                    if (!fileWidgetRoot.isNotFound) {
                        fileWidgetRoot.renameErrorMessage = ""
                        fileWidgetRoot.renaming = true
                        nameInput.forceActiveFocus()
                    }
                }
            }
        }

        // Hover-revealed action buttons matching FileWidgetNodeView.tsx
        RowLayout {
            opacity: hoverHandler.hovered || fileWidgetRoot.showColorPicker ? 1 : 0
            Behavior on opacity { NumberAnimation { duration: 150 } }
            spacing: 2

            ToolButton {
                id: renameActionButton
                visible: !fileWidgetRoot.renaming && !fileWidgetRoot.isNotFound
                Layout.preferredWidth: 24
                Layout.preferredHeight: 24
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Renomear arquivo")
                onClicked: {
                    fileWidgetRoot.renameErrorMessage = ""
                    fileWidgetRoot.renaming = true
                    nameInput.forceActiveFocus()
                }
                background: Rectangle { radius: 5; color: renameActionButton.hovered ? "#4d000000" : "transparent" }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: "edit"
                    color: renameActionButton.hovered ? "#fffffe" : "#a7a9be"
                    width: 12
                    height: 12
                }
            }

            ToolButton {
                id: colorActionButton
                Layout.preferredWidth: 24
                Layout.preferredHeight: 24
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Personalizar cor do widget")
                onClicked: fileWidgetRoot.showColorPicker = !fileWidgetRoot.showColorPicker
                background: Rectangle {
                    radius: 5
                    color: fileWidgetRoot.showColorPicker || colorActionButton.hovered ? "#4d000000" : "transparent"
                }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: "palette"
                    color: colorActionButton.hovered ? "#fffffe" : "#a7a9be"
                    width: 12
                    height: 12
                }
            }
        }

        ToolButton {
            id: deleteAttachmentButton
            Layout.preferredWidth: 24
            Layout.preferredHeight: 24
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Remover anexo")
            onClicked: fileWidgetRoot.requestDeleteConfirmation()
            background: Rectangle { radius: 6; color: deleteAttachmentButton.hovered ? "#33000000" : "transparent" }
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
        anchorItem: colorActionButton
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
