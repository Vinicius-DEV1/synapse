pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesMediaWidgetPickerOperations.js" as PickerOperations
import "NotesSlashCommandArguments.js" as SlashArgs
import "../ui"

Item {
    id: mediaPickerRoot
    anchors.fill: parent
    visible: activeMode.length > 0
    z: 140

    property var controller: null
    property string activeMode: "" // "documento" | "file-select" | "scrap" | "video" | "livro"
    property var listItems: []
    property string searchFilter: ""
    property bool isCapturingScrap: false
    property string scrapError: ""
    property string pendingScrapRequestId: ""

    signal insertWidgetRequested(string html)
    signal closed()

    function openMode(mode, prefillUrl, autoCaptureScrap) {
        activeMode = mode
        listItems = []
        searchFilter = ""
        isCapturingScrap = false
        scrapError = ""
        localFileUpload.reset()
        if (mode === "scrap" && prefillUrl && String(prefillUrl).trim().length > 0) {
            scrapUrlInput.text = String(prefillUrl).trim()
            if (autoCaptureScrap === true) {
                startScrapCapture()
                return
            }
        }
        var c = mediaPickerRoot.controller
        if (!c) return
        if (mode === "file-select" && typeof c.getFiles === "function") {
            listItems = c.getFiles("") || []
        } else if (mode === "video" && typeof c.getVideos === "function") {
            listItems = c.getVideos() || []
        } else if (mode === "livro" && typeof c.getLibraryBooks === "function") {
            listItems = c.getLibraryBooks("") || []
        }
    }

    function startScrapCapture() {
        var u = SlashArgs.normalizeWebUrl(scrapUrlInput.text)
        if (!u) {
            scrapError = qsTr("Informe um endereço válido, como https://site.com.")
            return
        }
        scrapError = ""
        var c = mediaPickerRoot.controller
        if (c && typeof c.captureWebScrap === "function") {
            isCapturingScrap = true
            pendingScrapRequestId = "scrap_" + Date.now()
            c.captureWebScrap(u, pendingScrapRequestId)
        } else {
            mediaPickerRoot.insertWidgetRequested(PickerOperations.capturedScrapWidgetHtml(
                scrapTitleInput.text.trim(), u, null))
            mediaPickerRoot.close()
        }
    }

    readonly property var filteredItems: {
        return PickerOperations.filteredItems(listItems, searchFilter)
    }
    function close() {
        if (localFileUpload.busy) return
        activeMode = ""
        isCapturingScrap = false
        closed()
    }

    Connections {
        target: mediaPickerRoot.controller
        ignoreUnknownSignals: true
        function onWebScrapCaptured(requestId, result) {
            if (!mediaPickerRoot.visible || requestId !== mediaPickerRoot.pendingScrapRequestId) return
            mediaPickerRoot.isCapturingScrap = false
            if (result.status === "error") {
                mediaPickerRoot.scrapError = result.error_reason || qsTr("Falha ao capturar página.")
                return
            }
            mediaPickerRoot.insertWidgetRequested(PickerOperations.capturedScrapWidgetHtml(
                scrapTitleInput.text.trim(), scrapUrlInput.text.trim(), result))
            mediaPickerRoot.close()
        }
    }

    Rectangle {
        anchors.fill: parent
        color: "#b0000000"
        MouseArea { anchors.fill: parent; onClicked: mediaPickerRoot.close() }
    }

    Rectangle {
        width: mediaPickerRoot.activeMode === "file-select" ? 512 : 440
        height: mediaPickerRoot.activeMode === "file-select"
            ? Math.min(parent.height - 48, Math.max(320, parent.height * 0.7))
            : Math.min(parent.height - 48, cardCol.implicitHeight + 40)
        anchors.centerIn: parent
        radius: 16
        color: "#1a1924"
        border.color: "#0fffffff"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: cardCol
            anchors.fill: parent
            anchors.margins: mediaPickerRoot.activeMode === "documento" ||
                mediaPickerRoot.activeMode === "documento-link" ? 16 : 20
            spacing: 12

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: mediaPickerRoot.activeMode === "documento" ? qsTr("Enviar arquivo(s)")
                        : mediaPickerRoot.activeMode === "documento-link" ? qsTr("Enviar arquivo(s) como link")
                        : mediaPickerRoot.activeMode === "file-select" ? qsTr("Vincular arquivo existente")
                        : mediaPickerRoot.activeMode === "video" ? qsTr("Vincular Vídeo")
                        : mediaPickerRoot.activeMode === "livro" ? qsTr("Vincular Livro da Biblioteca")
                        : qsTr("Snapshot Web Offline (Scrap)")
                    color: "#fffffe"
                    font.pixelSize: 15
                    font.bold: true
                    Layout.fillWidth: true
                }
                ToolButton {
                    id: closeButton
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    enabled: !localFileUpload.busy
                    onClicked: mediaPickerRoot.close()
                    background: Rectangle { radius: 6; color: closeButton.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#94a1b2"; width: 12; height: 12 }
                }
            }

            NotesMediaWidgetPickerLocalUpload {
                id: localFileUpload
                objectName: "notesLocalFileUpload"
                visible: mediaPickerRoot.activeMode === "documento" ||
                    mediaPickerRoot.activeMode === "documento-link"
                controller: mediaPickerRoot.controller
                isLink: mediaPickerRoot.activeMode === "documento-link"
                onWidgetHtmlReady: function(html) {
                    mediaPickerRoot.insertWidgetRequested(html)
                    mediaPickerRoot.close()
                }
            }

            TextField {
                objectName: "notesMediaWidgetSearchField"
                visible: mediaPickerRoot.activeMode === "file-select" ||
                    mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
                Layout.fillWidth: true
                Layout.preferredHeight: 36
                text: mediaPickerRoot.searchFilter
                placeholderText: mediaPickerRoot.activeMode === "file-select"
                    ? qsTr("Buscar arquivos...") : qsTr("Buscar...")
                color: "#fffffe"
                font.pixelSize: 12
                onTextEdited: mediaPickerRoot.searchFilter = text
                background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
            }

            NotesMediaWidgetPickerExistingItems {
                itemMode: mediaPickerRoot.activeMode
                items: mediaPickerRoot.listItems
                searchFilter: mediaPickerRoot.searchFilter
                visible: mediaPickerRoot.activeMode === "file-select" ||
                    mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.minimumHeight: 140
                Layout.preferredHeight: 220
                onItemSelected: function(item, mode) {
                    mediaPickerRoot.insertWidgetRequested(PickerOperations.widgetHtmlForPickedItem(item, mode))
                    mediaPickerRoot.close()
                }
            }

            RowLayout {
                visible: mediaPickerRoot.activeMode === "documento" ||
                    mediaPickerRoot.activeMode === "documento-link"
                Layout.fillWidth: true
                spacing: 10
                Item { Layout.fillWidth: true }
                Button {
                    id: cancelUploadButton
                    text: qsTr("Cancelar")
                    enabled: !localFileUpload.waiting
                    onClicked: mediaPickerRoot.close()
                    background: Rectangle { radius: 8; color: cancelUploadButton.hovered ? "#1affffff" : "transparent" }
                    contentItem: Text {
                        text: cancelUploadButton.text
                        color: "#a7a9be"
                        font.pixelSize: 12
                        font.weight: Font.DemiBold
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: 10
                        rightPadding: 10
                    }
                }
                Button {
                    id: uploadActionButton
                    objectName: "notesLocalUploadActionButton"
                    enabled: localFileUpload.localFiles.length > 0 && !localFileUpload.waiting
                    onClicked: localFileUpload.startUpload()
                    background: Rectangle {
                        radius: 8
                        color: uploadActionButton.enabled ? (uploadActionButton.hovered ? "#7c3aed" : "#8b5cf6") : "#7c8b5cf6"
                    }
                    contentItem: Text {
                        text: localFileUpload.waiting
                            ? qsTr("Criptografando...")
                            : localFileUpload.activeFileIndex >= 0
                                ? qsTr("Tentar novamente")
                                : qsTr("Enviar %1 arquivo(s)").arg(localFileUpload.localFiles.length)
                        color: localFileUpload.localFiles.length > 0 ? "#ffffff" : "#ffffff80"
                        font.pixelSize: 12
                        font.weight: Font.DemiBold
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: 14
                        rightPadding: 14
                    }
                }
            }

            ColumnLayout {
                visible: mediaPickerRoot.activeMode === "scrap"
                Layout.fillWidth: true
                spacing: 8
                TextField {
                    id: scrapUrlInput
                    Layout.fillWidth: true
                    placeholderText: "https://..."
                    color: "#fffffe"
                    background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
                    onAccepted: mediaPickerRoot.startScrapCapture()
                }
                TextField {
                    id: scrapTitleInput
                    Layout.fillWidth: true
                    placeholderText: qsTr("Título personalizado (opcional)")
                    color: "#fffffe"
                    background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
                }
                Text {
                    visible: mediaPickerRoot.scrapError.length > 0
                    text: mediaPickerRoot.scrapError
                    color: "#fda4af"
                    font.pixelSize: 11
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
                Button {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 36
                    enabled: !mediaPickerRoot.isCapturingScrap && scrapUrlInput.text.trim().length > 0
                    onClicked: mediaPickerRoot.startScrapCapture()
                    background: Rectangle { radius: 8; color: mediaPickerRoot.isCapturingScrap ? "#4d7c3aed" : "#7c3aed" }
                    contentItem: Text {
                        text: mediaPickerRoot.isCapturingScrap ? qsTr("Capturando página...") : qsTr("Capturar Snapshot")
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }
    }
}
