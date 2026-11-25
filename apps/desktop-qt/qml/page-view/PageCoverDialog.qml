import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Dialogs
import QtQuick.Layouts 1.15
import "../ui"

// Cover picker dialog mirroring PageCover.tsx presets, local upload & URL input
Popup {
    id: coverDialog

    property var controller: null
    property string pageId: ""
    property string currentCover: ""
    property bool isProcessing: false
    property string errorMessage: ""

    signal coverSaved(string url)
    signal errorOccurred(string message)

    function openCoverPicker() {
        errorMessage = ""
        coverUrlField.text = currentCover || ""
        open()
    }

    function saveCover(url) {
        var normalizedUrl = String(url || "").trim()
        if (!normalizedUrl || !coverDialog.controller ||
                !coverDialog.controller.updatePageCover(coverDialog.pageId, normalizedUrl)) {
            showError(qsTr("Não foi possível salvar a capa. Tente novamente."))
            return false
        }
        coverDialog.errorMessage = ""
        coverDialog.coverSaved(normalizedUrl)
        coverDialog.close()
        return true
    }

    function showError(message) {
        coverDialog.errorMessage = message
        coverDialog.errorOccurred(message)
    }

    Theme { id: theme }

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
        color: theme.bgDarkCard
        border.color: theme.borderCard
    }

    contentItem: ColumnLayout {
        spacing: 14

        RowLayout {
            Layout.fillWidth: true
            Label {
                Layout.fillWidth: true
                text: qsTr("Capa da página")
                color: theme.textDark
                font.pixelSize: 17
                font.weight: Font.DemiBold
            }
            ToolButton {
                id: closeDialogBtn
                text: "×"
                Accessible.name: qsTr("Fechar")
                onClicked: coverDialog.close()
                contentItem: Text {
                    text: closeDialogBtn.text
                    color: closeDialogBtn.hovered ? "#ffffff" : theme.textSubtext
                    font.pixelSize: 20
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }

        Button {
            id: uploadCoverBtn
            Layout.fillWidth: true
            Layout.preferredHeight: 46
            enabled: !!coverDialog.controller && !coverDialog.isProcessing && !coverDialog.controller.fileOperationRunning
            onClicked: coverFileDialog.open()
            background: Rectangle {
                radius: 10
                color: uploadCoverBtn.hovered ? "#1affffff" : theme.bgDarkSurface
                border.color: theme.borderCard
            }
            contentItem: RowLayout {
                spacing: 10
                AppIcon { name: "image"; color: theme.textSubtext; Layout.preferredWidth: 16; Layout.preferredHeight: 16 }
                Label { Layout.fillWidth: true; text: qsTr("Enviar imagem do computador"); color: theme.textDark; font.pixelSize: 13 }
                Label { text: coverDialog.isProcessing ? qsTr("Processando…") : ""; color: theme.textMuted; font.pixelSize: 11 }
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
            Rectangle { Layout.fillWidth: true; Layout.preferredHeight: 1; color: theme.borderSubtle }
            Label { text: qsTr("OU"); color: theme.textMuted; font.pixelSize: 10; font.weight: Font.DemiBold }
            Rectangle { Layout.fillWidth: true; Layout.preferredHeight: 1; color: theme.borderSubtle }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 7
            Label { text: qsTr("URL da imagem"); color: theme.textSubtext; font.pixelSize: 12; font.weight: Font.Medium }
            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                TextField {
                    id: coverUrlField
                    Layout.fillWidth: true
                    placeholderText: "https://..."
                    color: theme.textDark
                    selectByMouse: true
                    background: Rectangle {
                        radius: 8
                        color: theme.bgDarkBg
                        border.color: coverUrlField.activeFocus ? theme.brand500 : theme.borderCard
                    }
                }
                Button {
                    id: applyUrlBtn
                    text: qsTr("Aplicar")
                    enabled: coverUrlField.text.trim().length > 0
                    onClicked: coverDialog.saveCover(coverUrlField.text)
                    background: Rectangle { radius: 8; color: applyUrlBtn.enabled ? (applyUrlBtn.hovered ? theme.brand400 : theme.brand500) : "#403b50" }
                    contentItem: Label { text: applyUrlBtn.text; color: "#ffffff"; font.weight: Font.Medium; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter; leftPadding: 10; rightPadding: 10 }
                }
            }
        }

        Button {
            id: randomCoverBtn
            Layout.fillWidth: true
            enabled: !!coverDialog.controller && !coverDialog.isProcessing && !coverDialog.controller.fileOperationRunning
            onClicked: {
                coverDialog.errorMessage = ""
                coverDialog.isProcessing = true
                coverDialog.controller.processRandomNotesPageCover()
            }
            background: Rectangle { color: randomCoverBtn.hovered ? theme.bgHover : "transparent"; radius: 8 }
            contentItem: RowLayout {
                spacing: 8
                Label { text: "✦"; color: theme.brand400; font.pixelSize: 16 }
                Label { Layout.fillWidth: true; text: qsTr("Escolher capa aleatória"); color: randomCoverBtn.hovered ? theme.brand300 : theme.brand400; font.pixelSize: 12; horizontalAlignment: Text.AlignHCenter }
            }
        }
    }

    FileDialog {
        id: coverFileDialog
        title: qsTr("Escolher imagem de capa")
        fileMode: FileDialog.OpenFile
        nameFilters: [qsTr("Imagens (*.jpg *.jpeg *.png *.webp *.bmp)")]
        onAccepted: {
            if (!coverDialog.controller) return
            coverDialog.isProcessing = true
            coverDialog.controller.processNotesPageCover(selectedFile)
        }
    }

    Connections {
        target: coverDialog.controller
        ignoreUnknownSignals: true
        function onFileOperationFinished(result) {
            if (!result || result.operation !== "notes-cover-process") return
            coverDialog.isProcessing = false
            if (result.success) coverDialog.saveCover(result.coverImage)
            else coverDialog.showError(result.error || qsTr("Não foi possível processar a imagem de capa."))
        }
    }
}
