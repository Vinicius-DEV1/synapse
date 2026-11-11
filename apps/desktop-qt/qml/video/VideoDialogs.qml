import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs

Item {
    id: dialogs
    property var pendingDeleteVideo: null

    signal videoImportRequested(string sourcePath)
    signal videoDeleteConfirmed(var video)

    function openImport() { importDialog.open() }
    function requestDelete(video) {
        pendingDeleteVideo = video
        deleteDialog.open()
    }

    FileDialog {
        id: importDialog
        title: "Importar vídeo local"
        fileMode: FileDialog.OpenFile
        nameFilters: ["Arquivos de vídeo (*.mp4 *.mkv *.mov *.webm *.avi *.m4v *.mpeg *.mpg *.ts)", "Todos os arquivos (*)"]
        onAccepted: {
            var sourcePath = selectedFile.toLocalFile()
            if (sourcePath) dialogs.videoImportRequested(sourcePath)
        }
    }

    Dialog {
        id: deleteDialog
        title: "Excluir vídeo"
        modal: true
        anchors.centerIn: parent
        width: 420
        standardButtons: Dialog.NoButton
        background: Rectangle { color: "#1a1924"; border.color: "#2affffff"; radius: 14 }
        contentItem: Text {
            text: dialogs.pendingDeleteVideo
                ? "Deseja excluir ‘" + dialogs.pendingDeleteVideo.title + "’? O arquivo local criptografado e as marcações associadas serão removidos."
                : "Deseja excluir este vídeo?"
            color: "#d4d4dc"
            wrapMode: Text.Wrap
            padding: 20
        }
        footer: RowLayout {
            spacing: 10
            Item { Layout.fillWidth: true }
            Button {
                text: "Cancelar"
                onClicked: deleteDialog.reject()
                background: Rectangle { color: "#252435"; radius: 8; border.color: "#20ffffff" }
                contentItem: Text { text: parent.text; color: "#c4c5d4"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                text: "Excluir"
                onClicked: deleteDialog.accept()
                background: Rectangle { color: "#9f2941"; radius: 8 }
                contentItem: Text { text: parent.text; color: "white"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
        onAccepted: {
            if (dialogs.pendingDeleteVideo) dialogs.videoDeleteConfirmed(dialogs.pendingDeleteVideo)
            dialogs.pendingDeleteVideo = null
        }
        onRejected: dialogs.pendingDeleteVideo = null
    }
}
