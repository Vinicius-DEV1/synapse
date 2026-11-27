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
    property int selectedIndex: 0
    property bool isCapturingScrap: false
    property string scrapError: ""
    property string pendingScrapRequestId: ""

    signal insertWidgetRequested(string html)
    signal closed()

    onSearchFilterChanged: selectedIndex = 0

    function moveMediaSelection(delta) {
        var itemCount = filteredItems.length
        if (itemCount <= 0) return
        selectedIndex = (selectedIndex + delta + itemCount) % itemCount
    }

    function selectMediaSelection() {
        if (selectedIndex < 0 || selectedIndex >= filteredItems.length) return
        var item = filteredItems[selectedIndex]
        insertWidgetRequested(PickerOperations.widgetHtmlForPickedItem(item, activeMode))
        close()
    }

    function openMode(mode, prefillUrl, autoCaptureScrap) {
        activeMode = mode
        listItems = []
        searchFilter = ""
        selectedIndex = 0
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
        if (mode === "video" || mode === "livro" || mode === "file-select") {
            Qt.callLater(function() {
                if (mediaPickerRoot.activeMode === mode && mediaSearchField.visible)
                    mediaSearchField.forceActiveFocus()
            })
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
        color: "#80000000"
        MouseArea {
            anchors.fill: parent
            onClicked: {
                if (mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro")
                    mediaSearchField.forceActiveFocus()
            }
        }
    }

    Rectangle {
        width: mediaPickerRoot.activeMode === "file-select" ? 512
            : mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
                ? Math.max(0, Math.min(448, parent.width - 32)) : 440
        height: mediaPickerRoot.activeMode === "file-select"
            ? Math.min(parent.height - 48, Math.max(320, parent.height * 0.7))
            : mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
                ? Math.min(parent.height * 0.8, cardCol.implicitHeight + 32)
            : Math.min(parent.height - 48, cardCol.implicitHeight + 40)
        anchors.centerIn: parent
        radius: mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro" ? 12 : 16
        color: "#1a1924"
        border.color: mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
            ? "#1affffff" : "#0fffffff"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: cardCol
            anchors.fill: parent
            anchors.margins: mediaPickerRoot.activeMode === "documento" ||
                mediaPickerRoot.activeMode === "documento-link" ||
                mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro" ? 16 : 20
            spacing: mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro" ? 0 : 12

            RowLayout {
                Layout.fillWidth: true
                Layout.preferredHeight: mediaPickerRoot.activeMode === "video" ||
                    mediaPickerRoot.activeMode === "livro" ? 24 : -1
                AppIcon {
                    visible: mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
                    name: mediaPickerRoot.activeMode === "livro" ? "book-open" : "film"
                    color: mediaPickerRoot.activeMode === "livro" ? "#60a5fa" : "#c084fc"
                    Layout.preferredWidth: 18
                    Layout.preferredHeight: 18
                }
                Text {
                    text: mediaPickerRoot.activeMode === "documento" ? qsTr("Enviar arquivo(s)")
                        : mediaPickerRoot.activeMode === "documento-link" ? qsTr("Enviar arquivo(s) como link")
                        : mediaPickerRoot.activeMode === "file-select" ? qsTr("Vincular arquivo existente")
                        : mediaPickerRoot.activeMode === "video" ? qsTr("Vincular Vídeo")
                        : mediaPickerRoot.activeMode === "livro" ? qsTr("Vincular Livro")
                        : qsTr("Snapshot Web Offline (Scrap)")
                    color: "#fffffe"
                    font.pixelSize: 15
                    font.bold: true
                    Layout.fillWidth: true
                }
                ToolButton {
                    id: closeButton
                    objectName: "notesMediaWidgetPickerCloseButton"
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    enabled: !localFileUpload.busy
                    onClicked: mediaPickerRoot.close()
                    background: Rectangle { radius: 6; color: closeButton.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#94a1b2"; width: 16; height: 16 }
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

            Rectangle {
                objectName: "notesMediaWidgetSearchSection"
                visible: mediaPickerRoot.activeMode === "file-select" ||
                    mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
                Layout.fillWidth: true
                Layout.preferredHeight: mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
                    ? 68 : 36
                color: mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
                    ? "#08ffffff" : "transparent"
                Rectangle {
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.bottom: parent.bottom
                    height: mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro" ? 1 : 0
                    color: "#0dffffff"
                }
                TextField {
                    id: mediaSearchField
                    objectName: "notesMediaWidgetSearchField"
                    anchors.fill: parent
                    anchors.margins: mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro" ? 16 : 0
                    text: mediaPickerRoot.searchFilter
                    placeholderText: mediaPickerRoot.activeMode === "file-select"
                        ? qsTr("Buscar arquivos...") : qsTr("Buscar...")
                    color: "#fffffe"
                    font.pixelSize: 14
                    leftPadding: 34
                    onTextEdited: mediaPickerRoot.searchFilter = text
                    Keys.priority: Keys.BeforeItem
                    Keys.onPressed: function(event) {
                        if (event.key === Qt.Key_Down || event.key === Qt.Key_Up) {
                            mediaPickerRoot.moveMediaSelection(event.key === Qt.Key_Down ? 1 : -1)
                            event.accepted = true
                        } else if (event.key === Qt.Key_Enter || event.key === Qt.Key_Return) {
                            mediaPickerRoot.selectMediaSelection()
                            event.accepted = true
                        }
                    }
                    background: Rectangle {
                        radius: 8
                        color: "#0f0e17"
                        border.color: mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
                            ? "#1affffff" : "#2e2e38"
                        AppIcon {
                            anchors.left: parent.left
                            anchors.leftMargin: 10
                            anchors.verticalCenter: parent.verticalCenter
                            name: "search"
                            color: "#a7a9be"
                            width: 16
                            height: 16
                        }
                    }
                    Accessible.name: mediaPickerRoot.activeMode === "file-select"
                        ? qsTr("Buscar arquivos") : qsTr("Buscar mídia")
                }
            }

            NotesMediaWidgetPickerExistingItems {
                id: existingItems
                itemMode: mediaPickerRoot.activeMode
                items: mediaPickerRoot.listItems
                searchFilter: mediaPickerRoot.searchFilter
                selectedIndex: mediaPickerRoot.selectedIndex
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
                onSelectedIndexRequested: function(index) { mediaPickerRoot.selectedIndex = index }
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
