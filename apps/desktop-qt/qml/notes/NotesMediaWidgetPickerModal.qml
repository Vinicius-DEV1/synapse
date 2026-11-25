import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs
import "../ui"

Item {
    id: mediaPickerRoot
    anchors.fill: parent
    visible: activeMode.length > 0
    z: 140

    property var controller: null
    property string activeMode: "" // "documento" | "scrap" | "video" | "livro"
    property var listItems: []
    property string searchFilter: ""
    property bool isCapturingScrap: false
    property string scrapError: ""
    property string pendingScrapRequestId: ""
    property bool waitingLocalUpload: false
    property int preUploadCount: 0

    signal insertWidgetRequested(string html)
    signal closed()

    function openMode(mode, prefillUrl) {
        activeMode = mode
        listItems = []
        searchFilter = ""
        isCapturingScrap = false
        scrapError = ""
        if (mode === "scrap" && prefillUrl && String(prefillUrl).trim().length > 0) {
            scrapUrlInput.text = String(prefillUrl).trim()
            startScrapCapture()
            return
        }
        var c = mediaPickerRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
        if (!c) return
        if (mode === "documento" && typeof c.getFiles === "function") {
            listItems = c.getFiles("") || []
        } else if (mode === "video" && typeof c.getVideos === "function") {
            listItems = c.getVideos() || []
        } else if (mode === "livro" && typeof c.getLibraryBooks === "function") {
            listItems = c.getLibraryBooks("") || []
        }
    }

    function startScrapCapture() {
        var u = scrapUrlInput.text.trim()
        if (!u) return
        scrapError = ""
        var c = mediaPickerRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
        if (c && typeof c.captureWebScrap === "function") {
            isCapturingScrap = true
            pendingScrapRequestId = "scrap_" + Date.now()
            c.captureWebScrap(u, pendingScrapRequestId)
        } else {
            var t = (scrapTitleInput.text.trim() || "Captura Web").replace(/"/g, "&quot;")
            var eu = u.replace(/"/g, "&quot;")
            mediaPickerRoot.insertWidgetRequested("<div class=\"scrap-widget-block\" data-type=\"scrap-widget\" title=\"" + t + "\" data-title=\"" + t + "\" url=\"" + eu + "\" data-url=\"" + eu + "\"></div>")
            mediaPickerRoot.close()
        }
    }

    readonly property var filteredItems: {
        var q = searchFilter.trim().toLowerCase()
        if (q.length === 0) return listItems
        return listItems.filter(function(item) {
            var lbl = String(item.name || item.title || "").toLowerCase()
            return lbl.indexOf(q) >= 0
        })
    }

    function close() { activeMode = ""; isCapturingScrap = false; waitingLocalUpload = false; closed() }

    Connections {
        target: mediaPickerRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
        ignoreUnknownSignals: true
        function onWebScrapCaptured(requestId, result) {
            if (!mediaPickerRoot.visible || requestId !== mediaPickerRoot.pendingScrapRequestId) return
            mediaPickerRoot.isCapturingScrap = false
            if (result.status === "error") {
                mediaPickerRoot.scrapError = result.error_reason || qsTr("Falha ao capturar página.")
                return
            }
            var t = String(scrapTitleInput.text.trim() || result.title || "Captura Web").replace(/"/g, "&quot;")
            var u = String(result.url || scrapUrlInput.text.trim()).replace(/"/g, "&quot;")
            var sz = Number(result.file_size || 0)
            var exc = String(result.excerpt || "").replace(/"/g, "&quot;")
            mediaPickerRoot.insertWidgetRequested(
                "<div class=\"scrap-widget-block\" data-type=\"scrap-widget\" data-status=\"ready\" title=\"" + t +
                "\" data-title=\"" + t + "\" url=\"" + u + "\" data-url=\"" + u + "\" data-file-size=\"" + sz +
                "\" data-excerpt=\"" + exc + "\"></div>"
            )
            mediaPickerRoot.close()
        }
        function onStatsChanged() {
            var c = mediaPickerRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
            if (!mediaPickerRoot.waitingLocalUpload || !c) return
            var files = c.getFiles("") || []
            if (files.length > mediaPickerRoot.preUploadCount) {
                mediaPickerRoot.waitingLocalUpload = false
                var newest = files[0]
                var label = String(newest.name || "Arquivo").replace(/"/g, "&quot;")
                mediaPickerRoot.insertWidgetRequested(
                    "<div class=\"file-widget\" data-type=\"file-widget\" data-file-id=\"" + newest.id +
                    "\" data-name=\"" + label + "\" data-file-name=\"" + label + "\" data-file-type=\"" +
                    (newest.file_type || "document") + "\" data-file-size=\"" + (newest.file_size || 0) + "\"></div>"
                )
                mediaPickerRoot.close()
            }
        }
    }

    FileDialog {
        id: localFileDialog
        title: qsTr("Selecionar arquivo local (será criptografado com ENC1)")
        onAccepted: {
            var c = mediaPickerRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
            if (!c || typeof c.importLocalFile !== "function") return
            var files = c.getFiles("") || []
            mediaPickerRoot.preUploadCount = files.length
            mediaPickerRoot.waitingLocalUpload = true
            var path = selectedFile.toString().replace(/^file:\/\//, "")
            c.importLocalFile(decodeURIComponent(path), "")
        }
    }

    Rectangle {
        anchors.fill: parent
        color: "#b0000000"
        MouseArea { anchors.fill: parent; onClicked: mediaPickerRoot.close() }
    }

    Rectangle {
        width: 440
        height: Math.min(parent.height - 48, cardCol.implicitHeight + 40)
        anchors.centerIn: parent
        radius: 16
        color: "#161522"
        border.color: "#338b5cf6"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: cardCol
            anchors.fill: parent
            anchors.margins: 20
            spacing: 12

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: mediaPickerRoot.activeMode === "documento" ? qsTr("Enviar ou Vincular Arquivo")
                        : mediaPickerRoot.activeMode === "video" ? qsTr("Vincular Vídeo")
                        : mediaPickerRoot.activeMode === "livro" ? qsTr("Vincular Livro da Biblioteca")
                        : qsTr("Snapshot Web Offline (Scrap)")
                    color: "#fffffe"
                    font.pixelSize: 15
                    font.bold: true
                    Layout.fillWidth: true
                }
                ToolButton {
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    onClicked: mediaPickerRoot.close()
                    background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#94a1b2"; width: 12; height: 12 }
                }
            }

            Button {
                visible: mediaPickerRoot.activeMode === "documento"
                Layout.fillWidth: true
                Layout.preferredHeight: 36
                enabled: !mediaPickerRoot.waitingLocalUpload
                onClicked: localFileDialog.open()
                background: Rectangle { radius: 8; color: parent.hovered ? "#338b5cf6" : "#228b5cf6"; border.color: "#668b5cf6" }
                contentItem: RowLayout {
                    spacing: 6
                    Item { Layout.fillWidth: true }
                    AppIcon { name: "upload"; color: "#c4b5fd"; width: 14; height: 14 }
                    Text {
                        text: mediaPickerRoot.waitingLocalUpload ? qsTr("Criptografando (ENC1)...") : qsTr("Enviar Arquivo Local (ENC1)")
                        color: "#c4b5fd"
                        font.pixelSize: 12
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                }
            }

            TextField {
                visible: mediaPickerRoot.activeMode !== "scrap"
                Layout.fillWidth: true
                Layout.preferredHeight: 32
                text: mediaPickerRoot.searchFilter
                placeholderText: qsTr("Buscar...")
                color: "#fffffe"
                font.pixelSize: 12
                onTextEdited: mediaPickerRoot.searchFilter = text
                background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
            }

            ScrollView {
                visible: mediaPickerRoot.activeMode !== "scrap"
                Layout.fillWidth: true
                Layout.preferredHeight: 220
                clip: true
                ColumnLayout {
                    width: parent.width
                    spacing: 6
                    Repeater {
                        model: mediaPickerRoot.filteredItems
                        delegate: Button {
                            id: itemBtn
                            required property var modelData
                            Layout.fillWidth: true
                            Layout.preferredHeight: 40
                            onClicked: {
                                var label = String(itemBtn.modelData.name || itemBtn.modelData.title || "Item").replace(/"/g, "&quot;")
                                if (mediaPickerRoot.activeMode === "documento") {
                                    mediaPickerRoot.insertWidgetRequested("<div class=\"file-widget\" data-type=\"file-widget\" data-file-id=\"" + itemBtn.modelData.id + "\" data-name=\"" + label + "\" data-file-name=\"" + label + "\" data-file-type=\"" + (itemBtn.modelData.file_type || "document") + "\" data-file-size=\"" + (itemBtn.modelData.file_size || 0) + "\"></div>")
                                } else {
                                    var mType = mediaPickerRoot.activeMode === "livro" ? "book" : "video"
                                    mediaPickerRoot.insertWidgetRequested("<span class=\"media-widget\" data-type=\"media-widget\" data-media-type=\"" + mType + "\" data-media-id=\"" + itemBtn.modelData.id + "\" data-title=\"" + label + "\"></span>")
                                }
                                mediaPickerRoot.close()
                            }
                            background: Rectangle { radius: 8; color: itemBtn.hovered ? "#228b5cf6" : "#1d1c2e"; border.color: "#15ffffff" }
                            contentItem: Text {
                                text: itemBtn.modelData.name || itemBtn.modelData.title || ""
                                color: "#fffffe"
                                font.pixelSize: 12
                                elide: Text.ElideRight
                            }
                        }
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
