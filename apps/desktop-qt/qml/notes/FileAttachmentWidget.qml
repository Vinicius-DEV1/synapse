import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: fileWidgetRoot
    Layout.fillWidth: true
    implicitHeight: 64
    radius: 12
    color: "#16161e"
    border.color: hoverHandler.hovered ? accentColor : "#2e2e38"
    border.width: 1

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string fileId: attrs["data-file-id"] || attrs["file-id"] || ""
    property string fileName: attrs["data-file-name"] || attrs["file-name"] || qsTr("documento.pdf")
    property string fileType: attrs["data-file-type"] || attrs["file-type"] || "document"
    property int fileSize: parseInt(attrs["data-file-size"] || attrs["file-size"] || "0", 10) || 0
    property string accentColor: attrs["data-color"] || "#8b5cf6"
    property bool renaming: false
    property bool isDeleteDialogOpen: false

    signal attrsUpdated(var newAttrs)
    signal previewFileRequested(string fileId, string fileName)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function formatSize(bytes) {
        if (!bytes || bytes <= 0) return ""
        if (bytes < 1024) return bytes + " B"
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
        return (bytes / 1048576).toFixed(1) + " MB"
    }

    function commitAttr(key, value) {
        var next = Object.assign({}, attrs)
        next[key] = value
        attrsUpdated(next)
    }

    Rectangle {
        anchors.left: parent.left
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        width: 4
        radius: 2
        color: fileWidgetRoot.accentColor
    }

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 14
        anchors.rightMargin: 12
        spacing: 12

        Rectangle {
            Layout.preferredWidth: 36
            Layout.preferredHeight: 36
            radius: 8
            color: fileWidgetRoot.accentColor + "22"
            border.color: fileWidgetRoot.accentColor + "66"
            AppIcon {
                anchors.centerIn: parent
                name: fileWidgetRoot.fileType.indexOf("video") >= 0 ? "video"
                    : (fileWidgetRoot.fileType.indexOf("image") >= 0 ? "diagrams" : "files")
                color: fileWidgetRoot.accentColor
                width: 18
                height: 18
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2

            TextField {
                id: nameInput
                visible: fileWidgetRoot.renaming
                Layout.fillWidth: true
                text: fileWidgetRoot.fileName
                color: "#fffffe"
                font.pixelSize: 13
                background: Rectangle { radius: 4; color: "#0f0e17"; border.color: "#8b5cf6" }
                onAccepted: {
                    fileWidgetRoot.renaming = false
                    if (text.trim().length > 0 && text.trim() !== fileWidgetRoot.fileName) {
                        fileWidgetRoot.fileName = text.trim()
                        if (fileWidgetRoot.fileId && typeof dataController !== "undefined" && dataController) {
                            dataController.renameFile(fileWidgetRoot.fileId, fileWidgetRoot.fileName)
                        }
                        fileWidgetRoot.commitAttr("data-file-name", fileWidgetRoot.fileName)
                    }
                }
                onActiveFocusChanged: if (!activeFocus) fileWidgetRoot.renaming = false
            }

            Text {
                visible: !fileWidgetRoot.renaming
                text: fileWidgetRoot.fileName
                color: "#fffffe"
                font.pixelSize: 13
                font.weight: Font.DemiBold
                elide: Text.ElideRight
                Layout.fillWidth: true
                MouseArea {
                    anchors.fill: parent
                    onDoubleClicked: {
                        fileWidgetRoot.renaming = true
                        nameInput.forceActiveFocus()
                    }
                }
            }

            Text {
                text: fileWidgetRoot.fileType.toUpperCase() +
                      (fileWidgetRoot.fileSize > 0 ? (" • " + fileWidgetRoot.formatSize(fileWidgetRoot.fileSize)) : "")
                color: "#a7a9be"
                font.pixelSize: 11
            }
        }

        RowLayout {
            visible: hoverHandler.hovered
            spacing: 4
            Repeater {
                model: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"]
                delegate: Rectangle {
                    required property string modelData
                    Layout.preferredWidth: 11
                    Layout.preferredHeight: 11
                    radius: 6
                    color: modelData
                    border.color: fileWidgetRoot.accentColor === modelData ? "#ffffff" : "transparent"
                    border.width: 1.5
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            fileWidgetRoot.accentColor = modelData
                            fileWidgetRoot.commitAttr("data-color", modelData)
                        }
                    }
                }
            }
        }

        Button {
            Layout.preferredHeight: 28
            Layout.preferredWidth: 72
            focusPolicy: Qt.NoFocus
            onClicked: {
                if (fileWidgetRoot.fileId && typeof dataController !== "undefined" && dataController &&
                        typeof dataController.previewLocalFile === "function") {
                    dataController.previewLocalFile(fileWidgetRoot.fileId)
                }
                fileWidgetRoot.previewFileRequested(fileWidgetRoot.fileId, fileWidgetRoot.fileName)
            }
            background: Rectangle { radius: 6; color: parent.hovered ? "#2e2e38" : "#1f1f2e"; border.color: "#3a3a4c" }
            contentItem: Text {
                text: qsTr("Abrir")
                color: "#fffffe"
                font.pixelSize: 11
                font.weight: Font.Medium
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }

        ToolButton {
            visible: hoverHandler.hovered
            Layout.preferredWidth: 26
            Layout.preferredHeight: 26
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Remover anexo")
            onClicked: fileWidgetRoot.isDeleteDialogOpen = true
            background: Rectangle { radius: 6; color: parent.hovered ? "#22ef4444" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 13; height: 13 }
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
