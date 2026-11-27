pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesMediaWidgetPickerOperations.js" as PickerOperations
import "NotesSlashCommandArguments.js" as SlashArgs

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
        if (mode === "video" || mode === "livro") {
            Qt.callLater(function() {
                if (mediaPickerRoot.activeMode === mode && mediaSearchSection.inputField.visible)
                    mediaSearchSection.inputField.forceActiveFocus()
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
    readonly property bool uploadMode: activeMode === "documento" || activeMode === "documento-link"
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
        objectName: "notesMediaWidgetPickerBackdrop"
        anchors.fill: parent
        color: mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
            || mediaPickerRoot.uploadMode ? "#80000000" : "#b0000000"
        MouseArea {
            anchors.fill: parent
            onClicked: {
                if (mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro")
                    mediaSearchSection.inputField.forceActiveFocus()
                else
                    mediaPickerRoot.close()
            }
        }
    }

    Rectangle {
        objectName: "notesMediaWidgetPickerCard"
        width: mediaPickerRoot.activeMode === "file-select" ? 512
            : mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
                ? Math.max(0, Math.min(448, parent.width - 32))
                : mediaPickerRoot.uploadMode ? Math.max(0, Math.min(448, parent.width - 32)) : 440
        height: mediaPickerRoot.activeMode === "file-select"
            ? Math.min(parent.height - 48, Math.max(320, parent.height * 0.7))
            : mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
                ? Math.min(parent.height * 0.8, cardCol.implicitHeight + 32)
            : mediaPickerRoot.uploadMode
                ? Math.min(parent.height - 32, Math.max(320, localFileUpload.implicitHeight + 168))
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
            objectName: "notesMediaWidgetPickerCardLayout"
            visible: !mediaPickerRoot.uploadMode
            anchors.fill: parent
            anchors.margins: mediaPickerRoot.uploadMode ? 0 : mediaPickerRoot.activeMode === "documento" ||
                mediaPickerRoot.activeMode === "documento-link" ||
                mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro" ? 16 : 20
            spacing: mediaPickerRoot.uploadMode || mediaPickerRoot.activeMode === "video" ||
                mediaPickerRoot.activeMode === "livro" ? 0 : 12

            NotesMediaWidgetPickerHeader {
                objectName: "notesMediaWidgetPickerSecondaryHeader"
                mode: mediaPickerRoot.activeMode
                closeEnabled: !localFileUpload.busy
                onCloseRequested: mediaPickerRoot.close()
            }

            Item {
                objectName: "notesMediaWidgetPickerSearchContainer"
                visible: mediaPickerRoot.activeMode === "file-select" ||
                    mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
                Layout.fillWidth: true
                Layout.preferredHeight: mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
                    ? 68 : visible ? 36 : 0
                implicitHeight: Layout.preferredHeight

                NotesMediaWidgetPickerSearchField {
                    id: mediaSearchSection
                    anchors.fill: parent
                    mode: mediaPickerRoot.activeMode
                    searchFilter: mediaPickerRoot.searchFilter
                    onSearchFilterEdited: function(value) { mediaPickerRoot.searchFilter = value }
                }
            }

            Item {
                objectName: "notesMediaWidgetPickerExistingItemsContainer"
                visible: mediaPickerRoot.activeMode === "file-select" ||
                    mediaPickerRoot.activeMode === "video" || mediaPickerRoot.activeMode === "livro"
                Layout.fillWidth: true
                Layout.fillHeight: visible
                Layout.minimumHeight: visible ? 140 : 0
                Layout.preferredHeight: visible ? 220 : 0

                NotesMediaWidgetPickerExistingItems {
                    id: existingItems
                    anchors.fill: parent
                    itemMode: mediaPickerRoot.activeMode
                    items: mediaPickerRoot.listItems
                    searchFilter: mediaPickerRoot.searchFilter
                    onItemSelected: function(item, mode) {
                        mediaPickerRoot.insertWidgetRequested(PickerOperations.widgetHtmlForPickedItem(item, mode))
                        mediaPickerRoot.close()
                    }
                }
            }

            Item {
                objectName: "notesMediaWidgetPickerScrapContainer"
                visible: mediaPickerRoot.activeMode === "scrap"
                Layout.fillWidth: true
                Layout.preferredHeight: visible ? scrapForm.implicitHeight : 0
                implicitHeight: visible ? scrapForm.implicitHeight : 0

                ColumnLayout {
                    id: scrapForm
                    anchors.fill: parent
                    spacing: 8
                    TextField {
                        id: scrapUrlInput
                        objectName: "scrapUrlInput"
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

        Item {
            objectName: "notesMediaWidgetPickerUploadContainer"
            visible: mediaPickerRoot.uploadMode
            anchors.fill: parent

            NotesMediaWidgetPickerHeader {
                objectName: "notesMediaWidgetPickerHeader"
                x: 16
                y: 0
                width: parent.width - 32
                height: 56
                mode: mediaPickerRoot.activeMode
                closeEnabled: !localFileUpload.busy
                onCloseRequested: mediaPickerRoot.close()
            }

            NotesMediaWidgetPickerLocalUpload {
                id: localFileUpload
                objectName: "notesLocalFileUpload"
                x: 24
                y: 80
                width: Math.max(0, parent.width - 48)
                height: Math.max(0, parent.height - 128)
                controller: mediaPickerRoot.controller
                isLink: mediaPickerRoot.activeMode === "documento-link"
                onWidgetHtmlReady: function(html) {
                    mediaPickerRoot.insertWidgetRequested(html)
                    mediaPickerRoot.close()
                }
            }

            NotesMediaWidgetPickerUploadFooter {
                objectName: "notesLocalUploadFooter"
                width: parent.width
                height: 64
                anchors.bottom: parent.bottom
                upload: localFileUpload
                onCancelRequested: mediaPickerRoot.close()
                onUploadRequested: localFileUpload.startUpload()
            }
        }
    }
}
