pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs
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
    readonly property bool busy: waiting

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
        var html = PickerOperations.widgetHtmlForUploadedFiles(
            importedFiles, groupAsBundle, "")
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
        var c = controller || (typeof dataController !== "undefined" ? dataController : null)
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
        nextImportedFiles.push(completion.file)
        importedFiles = nextImportedFiles
        activeFileIndex += 1
        if (activeFileIndex >= localFiles.length) finishUpload()
        else Qt.callLater(startUpload)
    }

    Connections {
        target: localUploadRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
        ignoreUnknownSignals: true
        function onFileOperationFinished(result) { localUploadRoot.handleImportFinished(result) }
    }

    FileDialog {
        id: localFileDialog
        title: qsTr("Selecionar arquivos locais para criptografar com ENC1")
        fileMode: FileDialog.OpenFiles
        onAccepted: localUploadRoot.addFiles(selectedFiles)
    }

    RowLayout {
        Layout.fillWidth: true
        Button {
            id: addFilesButton
            objectName: "notesLocalAddFilesButton"
            Layout.fillWidth: true
            Layout.preferredHeight: 36
            enabled: !localUploadRoot.waiting
            onClicked: localFileDialog.open()
            Accessible.name: qsTr("Selecionar arquivos locais")
            background: Rectangle {
                radius: 8
                color: addFilesButton.enabled ? (addFilesButton.hovered ? "#338b5cf6" : "#228b5cf6") : "#14141420"
                border.color: "#668b5cf6"
            }
            contentItem: RowLayout {
                spacing: 6
                Item { Layout.fillWidth: true }
                AppIcon {
                    name: "upload"
                    color: "#c4b5fd"
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                }
                Text {
                    text: qsTr("Adicionar arquivos locais")
                    color: "#c4b5fd"
                    font.pixelSize: 12
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
            }
        }
    }

    ScrollView {
        visible: localUploadRoot.localFiles.length > 0
        Layout.fillWidth: true
        Layout.preferredHeight: Math.min(108, localUploadRoot.localFiles.length * 34)
        clip: true
        ColumnLayout {
            width: parent.width
            spacing: 4
            Repeater {
                model: localUploadRoot.localFiles
                delegate: Rectangle {
                    id: selectedFileRow
                    required property int index
                    required property string modelData
                    Layout.fillWidth: true
                    Layout.preferredHeight: 32
                    radius: 7
                    color: "#0f0e17"
                    border.color: "#15ffffff"
                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 9
                        anchors.rightMargin: 4
                        Text {
                            Layout.fillWidth: true
                            text: PickerOperations.fileNameFromUrl(selectedFileRow.modelData)
                            color: "#fffffe"
                            font.pixelSize: 11
                            elide: Text.ElideMiddle
                        }
                        ToolButton {
                            Layout.preferredWidth: 24
                            Layout.preferredHeight: 24
                            enabled: !localUploadRoot.waiting && localUploadRoot.activeFileIndex < 0
                            Accessible.name: qsTr("Remover %1 da seleção").arg(PickerOperations.fileNameFromUrl(selectedFileRow.modelData))
                            onClicked: localUploadRoot.removeFile(selectedFileRow.index)
                            contentItem: AppIcon {
                                name: "close"
                                color: parent.enabled ? "#a7a9be" : "#555563"
                                width: 11
                                height: 11
                            }
                        }
                    }
                }
            }
        }
    }

    CheckBox {
        visible: localUploadRoot.localFiles.length > 1
        text: qsTr("Agrupar arquivos em um único bloco")
        checked: localUploadRoot.groupAsBundle
        enabled: !localUploadRoot.waiting
        onToggled: localUploadRoot.groupAsBundle = checked
        Accessible.name: qsTr("Agrupar arquivos selecionados em um pacote")
    }

    Button {
        visible: localUploadRoot.localFiles.length > 0
        Layout.fillWidth: true
        Layout.preferredHeight: 36
        enabled: !localUploadRoot.waiting
        onClicked: localUploadRoot.startUpload()
        background: Rectangle {
            radius: 8
            color: parent.enabled ? "#7c3aed" : "#4d7c3aed"
        }
        contentItem: Text {
            text: localUploadRoot.waiting
                ? qsTr("Criptografando %1 de %2 com ENC1...").arg(localUploadRoot.activeFileIndex + 1).arg(localUploadRoot.localFiles.length)
                : localUploadRoot.activeFileIndex >= 0
                    ? qsTr("Tentar novamente (%1 arquivo(s) restantes)").arg(localUploadRoot.localFiles.length - localUploadRoot.activeFileIndex)
                    : qsTr("Anexar %1 arquivo(s)").arg(localUploadRoot.localFiles.length)
            color: "#ffffff"
            font.pixelSize: 12
            font.bold: true
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }

    Text {
        visible: localUploadRoot.errorMessage.length > 0
        text: localUploadRoot.errorMessage
        color: "#fda4af"
        font.pixelSize: 11
        wrapMode: Text.WordWrap
        Layout.fillWidth: true
    }
}
