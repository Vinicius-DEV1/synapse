pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Layouts 1.15
import "NotesMediaWidgetPickerOperations.js" as PickerOperations
import "../ui"

ColumnLayout {
    id: localUploadRoot
    Layout.fillWidth: true
    spacing: 8

    property var controller: null
    property var localFiles: []
    property var importedFiles: []
    property int activeFileIndex: -1
    property int requestSequence: 0
    property string pendingRequestId: ""
    property string errorMessage: ""
    property bool waiting: false
    property bool groupAsBundle: true
    property bool isLink: false
    readonly property bool busy: waiting
    readonly property int progressPercent: waiting && localFiles.length > 0
        ? Math.round(activeFileIndex * 100 / localFiles.length) : 0

    signal widgetHtmlReady(string html)

    function addFiles(urls) {
        if (waiting || !urls || typeof urls.length !== "number") return
        var nextFiles = localFiles.slice()
        var knownUrls = new Set(nextFiles.map(function(url) { return String(url) }))
        for (var index = 0; index < urls.length; ++index) {
            var url = String(urls[index])
            if (url.length > 0 && !knownUrls.has(url)) {
                nextFiles.push(url)
                knownUrls.add(url)
            }
        }
        localFiles = nextFiles
        errorMessage = ""
    }

    function removeFile(index) {
        if (waiting || activeFileIndex >= 0 || index < 0 || index >= localFiles.length) return
        localFiles = localFiles.filter(function(url, currentIndex) { return currentIndex !== index })
    }

    function reset() {
        if (waiting) return
        localFiles = []
        importedFiles = []
        activeFileIndex = -1
        pendingRequestId = ""
        errorMessage = ""
        groupAsBundle = true
    }

    function finishUpload() {
        var html = PickerOperations.widgetHtmlForUploadedFiles(importedFiles, groupAsBundle)
        if (!html) {
            errorMessage = qsTr("Não foi possível preparar os arquivos para a página.")
            return
        }
        widgetHtmlReady(html)
        reset()
    }

    function startUpload() {
        if (waiting || localFiles.length === 0) return
        errorMessage = ""
        if (activeFileIndex < 0) {
            importedFiles = []
            activeFileIndex = 0
        }
        if (activeFileIndex >= localFiles.length) {
            finishUpload()
            return
        }
        var c = controller
        if (!c || typeof c.importLocalFile !== "function") {
            errorMessage = qsTr("A importação de arquivos não está disponível.")
            activeFileIndex = -1
            return
        }
        requestSequence += 1
        pendingRequestId = "notes_widget_upload_" + Date.now() + "_" + requestSequence
        waiting = true
        c.importLocalFile(PickerOperations.filePathFromUrl(localFiles[activeFileIndex]), "", pendingRequestId)
    }

    function handleImportFinished(result) {
        var completion = PickerOperations.localUploadCompletion(
            pendingRequestId, result, qsTr("Não foi possível importar o arquivo."))
        if (!completion) return
        waiting = false
        pendingRequestId = ""
        if (!completion.success) {
            errorMessage = completion.error
            return
        }
        var nextImportedFiles = importedFiles.slice()
        completion.file.isLink = localUploadRoot.isLink
        nextImportedFiles.push(completion.file)
        importedFiles = nextImportedFiles
        activeFileIndex += 1
        if (activeFileIndex >= localFiles.length) finishUpload()
        else Qt.callLater(startUpload)
    }

    Connections {
        target: localUploadRoot.controller
        ignoreUnknownSignals: true
        function onFileOperationFinished(result) { localUploadRoot.handleImportFinished(result) }
    }

    NotesLocalUploadSelection {
        objectName: "notesLocalUploadSelection"
        localFiles: localUploadRoot.localFiles
        waiting: localUploadRoot.waiting
        canRemove: localUploadRoot.activeFileIndex < 0
        groupAsBundle: localUploadRoot.groupAsBundle
        onFilesSelected: function(urls) { localUploadRoot.addFiles(urls) }
        onFileRemovalRequested: function(index) { localUploadRoot.removeFile(index) }
        onGroupingChanged: function(grouped) { localUploadRoot.groupAsBundle = grouped }
    }

    Rectangle {
        visible: localUploadRoot.errorMessage.length > 0
        Layout.fillWidth: true
        implicitHeight: errorText.implicitHeight + 20
        radius: 8
        color: "#1af43f5e"
        border.color: "#33f43f5e"
        RowLayout {
            anchors.fill: parent
            anchors.margins: 10
            spacing: 8
            AppIcon { name: "alert-circle"; color: "#fb7185"; Layout.preferredWidth: 17; Layout.preferredHeight: 17 }
            Text {
                id: errorText
                Layout.fillWidth: true
                text: localUploadRoot.errorMessage
                color: "#fecdd3"
                font.pixelSize: 12
                wrapMode: Text.WordWrap
            }
        }
    }

    ColumnLayout {
        visible: localUploadRoot.waiting
        Layout.fillWidth: true
        spacing: 7
        RowLayout {
            Layout.fillWidth: true
            Text {
                Layout.fillWidth: true
                text: qsTr("Criptografando arquivo %1 de %2 com ENC1...")
                    .arg(localUploadRoot.activeFileIndex + 1).arg(localUploadRoot.localFiles.length)
                color: "#a7a9be"
                font.pixelSize: 12
            }
            Text {
                text: localUploadRoot.progressPercent + "%"
                color: "#a7a9be"
                font.pixelSize: 12
            }
        }
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 7
            radius: 4
            color: "#0f0e17"
            clip: true
            Rectangle {
                width: parent.width * localUploadRoot.progressPercent / 100
                height: parent.height
                radius: 4
                color: "#8b5cf6"
                Behavior on width { NumberAnimation { duration: 220; easing.type: Easing.OutCubic } }
            }
        }
    }
}
