import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Dialogs
import QtQuick.Layouts 1.15
import ".."

Popup {
    id: coverDialog

    property var controller: null
    property string pageId: ""
    property bool isProcessing: false
    property string errorMessage: ""

    signal coverSelected(string url)
    signal actionFailed(string message)

    modal: true
    focus: true
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    width: Math.max(0, Math.min(460, Overlay.overlay ? Overlay.overlay.width - 32 : 460))
    padding: 22
    parent: Overlay.overlay
    x: parent ? Math.round((parent.width - width) / 2) : 0
    y: parent ? Math.round((parent.height - implicitHeight) / 2) : 0
    onOpened: errorMessage = ""

    background: Rectangle {
        radius: 16
        color: "#191824"
        border.color: "#12ffffff"
    }

    function saveCover(url) {
        const normalizedUrl = String(url || "").trim()
        if (!normalizedUrl || !coverDialog.controller ||
                !coverDialog.controller.updatePageCover(coverDialog.pageId, normalizedUrl)) {
            showError(qsTr("The cover could not be saved. Try again."))
            return false
        }
        coverDialog.errorMessage = ""
        coverDialog.coverSelected(normalizedUrl)
        coverDialog.close()
        return true
    }

    function showError(message) {
        coverDialog.errorMessage = message
        coverDialog.actionFailed(message)
    }

    contentItem: ColumnLayout {
        spacing: 14

        RowLayout {
            Layout.fillWidth: true
            Label {
                Layout.fillWidth: true
                text: qsTr("Page cover")
                color: "#fffffe"
                font.pixelSize: 18
                font.weight: Font.DemiBold
            }
            ToolButton {
                text: "×"
                Accessible.name: qsTr("Close")
                onClicked: coverDialog.close()
                contentItem: Text {
                    text: parent.text
                    color: parent.hovered ? "white" : "#a7a9be"
                    font.pixelSize: 22
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }

        Button {
            Layout.fillWidth: true
            Layout.preferredHeight: 52
            enabled: !!coverDialog.controller && !coverDialog.isProcessing && !coverDialog.controller.fileOperationRunning
            onClicked: coverFileDialog.open()
            background: Rectangle {
                radius: 10
                color: parent.hovered ? "#20ffffff" : "#0dffffff"
                border.color: "#12ffffff"
            }
            contentItem: RowLayout {
                spacing: 10
                AppIcon { name: "image"; color: "#dedee5" }
                Label { Layout.fillWidth: true; text: qsTr("Upload from computer"); color: "#dedee5" }
                Label { text: coverDialog.isProcessing ? qsTr("Preparing…") : ""; color: "#a7a9be" }
            }
        }

        Label {
            Layout.fillWidth: true
            visible: coverDialog.errorMessage.length > 0
            text: coverDialog.errorMessage
            color: "#fda4af"
            font.pixelSize: 12
            wrapMode: Text.Wrap
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 10
            Rectangle { Layout.fillWidth: true; height: 1; color: "#12ffffff" }
            Label { text: qsTr("OR"); color: "#777789"; font.pixelSize: 10; font.weight: Font.DemiBold }
            Rectangle { Layout.fillWidth: true; height: 1; color: "#12ffffff" }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 7
            Label { text: qsTr("Image URL"); color: "#a7a9be"; font.pixelSize: 12; font.weight: Font.Medium }
            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                TextField {
                    id: coverUrlField
                    Layout.fillWidth: true
                    placeholderText: "https://..."
                    color: "#fffffe"
                    selectByMouse: true
                    background: Rectangle {
                        radius: 8
                        color: "#0f0e17"
                        border.color: coverUrlField.activeFocus ? "#8b5cf6" : "#18ffffff"
                    }
                }
                Button {
                    text: qsTr("Save")
                    enabled: coverUrlField.text.trim().length > 0
                    onClicked: coverDialog.saveCover(coverUrlField.text)
                    background: Rectangle { radius: 8; color: parent.enabled ? (parent.hovered ? "#a78bfa" : "#8b5cf6") : "#403b50" }
                    contentItem: Label { text: parent.text; color: "white"; font.weight: Font.Medium; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter; leftPadding: 10; rightPadding: 10 }
                }
            }
        }

        Button {
            Layout.fillWidth: true
            enabled: !!coverDialog.controller && !coverDialog.isProcessing && !coverDialog.controller.fileOperationRunning
            onClicked: {
                coverDialog.errorMessage = ""
                coverDialog.isProcessing = true
                coverDialog.controller.processRandomNotesPageCover()
            }
            background: Rectangle { color: "transparent"; radius: 8 }
            contentItem: RowLayout {
                spacing: 8
                Label { text: "✦"; color: "#a78bfa"; font.pixelSize: 17 }
                Label { Layout.fillWidth: true; text: qsTr("Choose a random cover"); color: parent.parent.hovered ? "#c4b5fd" : "#a78bfa"; horizontalAlignment: Text.AlignHCenter }
            }
        }
    }

    FileDialog {
        id: coverFileDialog
        title: qsTr("Choose a page cover image")
        fileMode: FileDialog.OpenFile
        nameFilters: [qsTr("Images (*.jpg *.jpeg *.png *.webp *.bmp)")]
        onAccepted: {
            if (!coverDialog.controller) return
            coverDialog.isProcessing = true
            coverDialog.controller.processNotesPageCover(selectedFile)
        }
    }

    Connections {
        target: coverDialog.controller
        function onFileOperationFinished(result) {
            if (!result || result.operation !== "notes-cover-process") return
            coverDialog.isProcessing = false
            if (result.success) coverDialog.saveCover(result.coverImage)
            else coverDialog.showError(result.error || qsTr("Could not process the cover image."))
        }
    }
}
