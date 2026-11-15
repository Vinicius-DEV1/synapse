import QtQuick 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: fileWidgetRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 60
    radius: 12
    color: "#16161e"
    border.color: fileMouse.containsMouse ? "#7c3aed" : "#2e2e38"
    border.width: 1

    property string fileId: ""
    property string fileName: "documento.pdf"
    property string fileType: "document"
    property int fileSize: 0
    property string localPath: ""

    signal openRequested()
    signal deleteRequested()

    property bool isDeleteDialogOpen: false

    function formatSize(bytes) {
        if (!bytes || bytes <= 0) return ""
        if (bytes < 1024) return bytes + " B"
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
        return (bytes / 1048576).toFixed(1) + " MB"
    }

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 12
        spacing: 12

        Rectangle {
            Layout.preferredWidth: 36
            Layout.preferredHeight: 36
            radius: 8
            color: "#281b38"
            border.color: "#7c3aed"
            border.width: 1

            AppIcon {
                anchors.centerIn: parent
                name: fileWidgetRoot.fileType === "video" ? "video" : (fileWidgetRoot.fileType === "image" ? "diagrams" : "notes")
                color: "#c4b5fd"
                Layout.preferredWidth: 18
                Layout.preferredHeight: 18
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2

            Text {
                text: fileWidgetRoot.fileName
                color: "#fffffe"
                font.pixelSize: 13
                font.weight: Font.DemiBold
                elide: Text.ElideRight
                Layout.fillWidth: true
            }

            Text {
                text: fileWidgetRoot.fileType.toUpperCase() + (fileWidgetRoot.fileSize > 0 ? (" • " + fileWidgetRoot.formatSize(fileWidgetRoot.fileSize)) : "")
                color: "#a7a9be"
                font.pixelSize: 11
            }
        }

        // Open Button
        Rectangle {
            Layout.preferredHeight: 30
            Layout.preferredWidth: 64
            radius: 6
            color: openMouse.containsMouse ? "#2e2e38" : "#1f1f2e"
            border.color: "#3a3a4c"
            border.width: 1

            Text {
                anchors.centerIn: parent
                text: "Abrir"
                color: "#fffffe"
                font.pixelSize: 11
                font.weight: Font.Medium
            }

            MouseArea {
                id: openMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    if (fileWidgetRoot.localPath.length > 0) {
                        Qt.openUrlExternally("file://" + fileWidgetRoot.localPath)
                    }
                    fileWidgetRoot.openRequested()
                }
            }
        }

        // Delete Button
        Rectangle {
            Layout.preferredWidth: 30
            Layout.preferredHeight: 30
            radius: 6
            color: delBtnMouse.containsMouse ? "#3b1e28" : "transparent"

            AppIcon {
                anchors.centerIn: parent
                name: "trash"
                color: delBtnMouse.containsMouse ? "#ef4444" : "#6b7280"
                Layout.preferredWidth: 14
                Layout.preferredHeight: 14
            }

            MouseArea {
                id: delBtnMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: fileWidgetRoot.isDeleteDialogOpen = true
            }
        }
    }

    MouseArea {
        id: fileMouse
        anchors.fill: parent
        hoverEnabled: true
        z: -1
    }

    FileAttachmentDeleteDialog {
        isOpen: fileWidgetRoot.isDeleteDialogOpen
        fileName: fileWidgetRoot.fileName
        onClosed: fileWidgetRoot.isDeleteDialogOpen = false
        onConfirmed: fileWidgetRoot.deleteRequested()
    }
}
