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
    property var attrs: blockData.attrs || ({})
    property string fileId: attrs["data-file-id"] || attrs["file-id"] || attrs["fileId"] || ""
    property string fileName: attrs["data-name"] || attrs["name"] || attrs["data-file-name"] || attrs["file-name"] || qsTr("Arquivo")
    property string fileType: (attrs["data-file-type"] || attrs["file-type"] || attrs["fileType"] || "other").toLowerCase()
    property bool isLink: (attrs["data-is-link"] || attrs["isLink"] || "false") === "true"
    property int fileSize: parseInt(attrs["data-file-size"] || attrs["file-size"] || "0", 10) || 0
    property string accentColor: attrs["data-color"] || attrs["color"] || "default"
    property bool renaming: false
    property bool showColorPicker: false
    property bool isDeleteDialogOpen: false
    property bool isNotFound: false

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

    HoverHandler { id: hoverHandler }

    function syncFromCore() {
        if (!fileId || typeof dataController === "undefined" || !dataController || typeof dataController.getFiles !== "function") return
        var all = dataController.getFiles("") || []
        if (all.length === 0) return
        var found = null
        for (var i = 0; i < all.length; i++) {
            if (all[i].id === fileId) {
                found = all[i]
                break
            }
        }
        if (found) {
            isNotFound = false
            if (found.name) fileName = found.name
            if (found.file_type) fileType = String(found.file_type).toLowerCase()
            if (found.file_size) fileSize = Number(found.file_size) || 0
        }
    }

    function commitAttr(key, value) {
        var next = Object.assign({}, attrs)
        next[key] = value
        attrsUpdated(next)
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
    onBlockDataChanged: syncFromCore()

    MouseArea {
        anchors.fill: parent
        cursorShape: Qt.PointingHandCursor
        onClicked: {
            if (fileWidgetRoot.renaming) return
            if (fileWidgetRoot.fileId && typeof dataController !== "undefined" && dataController &&
                    typeof dataController.previewLocalFile === "function") {
                dataController.previewLocalFile(fileWidgetRoot.fileId)
            }
            fileWidgetRoot.previewFileRequested(fileWidgetRoot.fileId, fileWidgetRoot.fileName)
        }
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
                background: Rectangle {
                    radius: 4
                    color: "#66000000"
                    border.color: "#cc8b5cf6"
                    border.width: 1
                }
                onAccepted: {
                    var trimmed = text.trim()
                    fileWidgetRoot.renaming = false
                    if (trimmed.length > 0 && trimmed !== fileWidgetRoot.fileName) {
                        fileWidgetRoot.fileName = trimmed
                        if (fileWidgetRoot.fileId && typeof dataController !== "undefined" && dataController &&
                                typeof dataController.renameFile === "function") {
                            dataController.renameFile(fileWidgetRoot.fileId, trimmed)
                        }
                        var next = Object.assign({}, fileWidgetRoot.attrs)
                        next["data-name"] = trimmed
                        next["data-file-name"] = trimmed
                        fileWidgetRoot.attrsUpdated(next)
                    }
                }
                Keys.onEscapePressed: fileWidgetRoot.renaming = false
            }

            ToolButton {
                Layout.preferredWidth: 22
                Layout.preferredHeight: 22
                focusPolicy: Qt.NoFocus
                onClicked: nameInput.accepted()
                background: Rectangle { radius: 4; color: parent.hovered ? "#3310b981" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "check"; color: "#34d399"; width: 13; height: 13 }
            }

            ToolButton {
                Layout.preferredWidth: 22
                Layout.preferredHeight: 22
                focusPolicy: Qt.NoFocus
                onClicked: fileWidgetRoot.renaming = false
                background: Rectangle { radius: 4; color: parent.hovered ? "#1affffff" : "transparent" }
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
                onClicked: {
                    if (fileWidgetRoot.fileId && typeof dataController !== "undefined" && dataController &&
                            typeof dataController.previewLocalFile === "function") {
                        dataController.previewLocalFile(fileWidgetRoot.fileId)
                    }
                    fileWidgetRoot.previewFileRequested(fileWidgetRoot.fileId, fileWidgetRoot.fileName)
                }
                onDoubleClicked: {
                    if (!fileWidgetRoot.isNotFound) {
                        fileWidgetRoot.renaming = true
                        nameInput.forceActiveFocus()
                    }
                }
            }
        }

        // Inline Color Picker Popover Pill (shown only when palette icon clicked)
        Rectangle {
            visible: fileWidgetRoot.showColorPicker
            Layout.preferredHeight: 24
            Layout.preferredWidth: swatchRow.implicitWidth + 12
            radius: 6
            color: "#1a1924"
            border.color: "#22ffffff"
            border.width: 1

            RowLayout {
                id: swatchRow
                anchors.centerIn: parent
                spacing: 5
                Repeater {
                    model: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"]
                    delegate: Rectangle {
                        required property string modelData
                        width: 13
                        height: 13
                        radius: 6.5
                        color: modelData
                        border.color: fileWidgetRoot.accentColor === modelData ? "#ffffff" : "#33ffffff"
                        border.width: fileWidgetRoot.accentColor === modelData ? 1.5 : 1
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                fileWidgetRoot.accentColor = modelData
                                fileWidgetRoot.showColorPicker = false
                                fileWidgetRoot.commitAttr("data-color", modelData)
                            }
                        }
                    }
                }
                ToolButton {
                    Layout.preferredWidth: 16
                    Layout.preferredHeight: 16
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Cor padrão")
                    onClicked: {
                        fileWidgetRoot.accentColor = "default"
                        fileWidgetRoot.showColorPicker = false
                        fileWidgetRoot.commitAttr("data-color", "default")
                    }
                    background: Rectangle { radius: 8; color: "transparent"; border.color: "#33ffffff" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#a7a9be"; width: 8; height: 8 }
                }
            }
        }

        // Hover-revealed action buttons matching FileWidgetNodeView.tsx
        RowLayout {
            opacity: hoverHandler.hovered || fileWidgetRoot.showColorPicker ? 1 : 0
            Behavior on opacity { NumberAnimation { duration: 150 } }
            spacing: 2

            ToolButton {
                visible: !fileWidgetRoot.renaming && !fileWidgetRoot.isNotFound
                Layout.preferredWidth: 24
                Layout.preferredHeight: 24
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Renomear arquivo")
                onClicked: {
                    fileWidgetRoot.renaming = true
                    nameInput.forceActiveFocus()
                }
                background: Rectangle { radius: 5; color: parent.hovered ? "#4d000000" : "transparent" }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: "edit"
                    color: parent.hovered ? "#fffffe" : "#a7a9be"
                    width: 12
                    height: 12
                }
            }

            ToolButton {
                Layout.preferredWidth: 24
                Layout.preferredHeight: 24
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Personalizar cor do widget")
                onClicked: fileWidgetRoot.showColorPicker = !fileWidgetRoot.showColorPicker
                background: Rectangle {
                    radius: 5
                    color: fileWidgetRoot.showColorPicker || parent.hovered ? "#4d000000" : "transparent"
                }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: "palette"
                    color: parent.hovered ? "#fffffe" : "#a7a9be"
                    width: 12
                    height: 12
                }
            }
        }

        ToolButton {
            Layout.preferredWidth: 24
            Layout.preferredHeight: 24
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Remover anexo")
            onClicked: fileWidgetRoot.isDeleteDialogOpen = true
            background: Rectangle { radius: 6; color: parent.hovered ? "#33000000" : "transparent" }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "close"
                color: parent.hovered ? "#f87171" : "#a7a9be"
                width: 14
                height: 14
            }
        }
    }

    FileAttachmentDeleteDialog {
        isOpen: fileWidgetRoot.isDeleteDialogOpen
        fileName: fileWidgetRoot.fileName
        onConfirmed: {
            fileWidgetRoot.isDeleteDialogOpen = false
            fileWidgetRoot.removeRequested()
        }
        onClosed: fileWidgetRoot.isDeleteDialogOpen = false
    }
}
