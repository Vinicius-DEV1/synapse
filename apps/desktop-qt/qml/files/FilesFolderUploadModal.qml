import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs

Rectangle {
    id: root
    anchors.fill: parent
    color: "#80000000"
    visible: false
    z: 200

    property string targetFolderId: ""
    property string folderPath: ""
    property string folderName: ""
    property bool isUploading: false
    property double totalProgress: 0.0
    property int totalFiles: 0
    property int completedFiles: 0
    property string uploadStatus: ""

    signal closeRequested()
    signal folderUploadCompleted(string path, string parentFolderId)

    function openModal(parentId) {
        targetFolderId = parentId || ""
        folderPath = ""
        folderName = ""
        isUploading = false
        totalProgress = 0.0
        totalFiles = 0
        completedFiles = 0
        uploadStatus = ""
        visible = true
    }

    function closeModal() {
        if (isUploading && totalProgress < 1.0) return
        visible = false
        closeRequested()
    }

    FolderDialog {
        id: dirPicker
        title: "Selecionar Pasta para Importar"
        onAccepted: {
            var path = selectedFolder.toString().replace(/^file:\/\//, "")
            root.folderPath = path
            var parts = path.split(/[\/\\]/)
            root.folderName = parts[parts.length - 1] || "Pasta"
            root.totalFiles = 1
            root.completedFiles = 0
            root.uploadStatus = "Pasta pronta para importação e criptografia E2EE."
        }
    }

    function startUpload() {
        if (!folderPath || folderPath.length === 0) return
        isUploading = true
        totalProgress = 1.0
        uploadStatus = "Importando hierarquia de arquivos e criptografando..."
        root.folderUploadCompleted(root.folderPath, root.targetFolderId)
        closeModal()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: root.closeModal()
    }

    Rectangle {
        id: card
        width: Math.min(parent.width - 32, 520)
        implicitHeight: contentCol.implicitHeight + 36
        anchors.centerIn: parent
        radius: 16
        color: "#161524"
        border.color: "#25ffffff"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: contentCol
            anchors.fill: parent
            anchors.margins: 20
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text { text: "📁"; font.pixelSize: 22 }
                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "Importar Pasta Completa"
                        color: "#fffffe"
                        font.pixelSize: 17
                        font.bold: true
                    }
                    Text {
                        text: "Importação recursiva com criptografia ponta-a-ponta"
                        color: "#818cf8"
                        font.pixelSize: 11
                    }
                }

                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 28; height: 28; radius: 6
                    color: "#15ffffff"
                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent
                        enabled: !root.isUploading
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.closeModal()
                    }
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

            // Directory selection card
            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 74
                radius: 10
                color: dirArea.hovered ? "#222133" : "#1a1928"
                border.color: root.folderPath.length > 0 ? "#6366f1" : "#25ffffff"
                border.width: root.folderPath.length > 0 ? 1.5 : 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: 12

                    Text { text: "📂"; font.pixelSize: 28 }
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        Text {
                            text: root.folderName.length > 0 ? root.folderName : "Clique para selecionar uma pasta local"
                            color: root.folderName.length > 0 ? "#fffffe" : "#a7a9be"
                            font.pixelSize: 14
                            font.bold: root.folderName.length > 0
                            elide: Text.ElideMiddle
                        }
                        Text {
                            text: root.folderPath.length > 0 ? root.folderPath : "Todos os subdiretórios e arquivos serão preservados"
                            color: "#64748b"
                            font.pixelSize: 11
                            elide: Text.ElideMiddle
                        }
                    }
                }

                MouseArea {
                    id: dirArea
                    anchors.fill: parent
                    hoverEnabled: true
                    enabled: !root.isUploading
                    cursorShape: Qt.PointingHandCursor
                    onClicked: dirPicker.open()
                }
            }

            // Progress & Status
            ColumnLayout {
                visible: root.isUploading || root.totalProgress === 1.0
                Layout.fillWidth: true
                spacing: 6

                RowLayout {
                    Layout.fillWidth: true
                    Text { text: root.uploadStatus; color: "#a78bfa"; font.pixelSize: 12; elide: Text.ElideRight; Layout.fillWidth: true }
                    Text { text: Math.round(root.totalProgress * 100) + "%"; color: "#818cf8"; font.pixelSize: 12; font.bold: true }
                }

                ProgressBar {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 8
                    value: root.totalProgress

                    background: Rectangle { color: "#252436"; radius: 4 }
                    contentItem: Item {
                        Rectangle {
                            width: parent.width * root.totalProgress
                            height: parent.height
                            radius: 4
                            color: "#6366f1"
                        }
                    }
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

            // Actions
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    Layout.preferredWidth: 100
                    Layout.preferredHeight: 38
                    text: root.totalProgress === 1.0 ? "Concluir" : "Cancelar"
                    enabled: !root.isUploading || root.totalProgress === 1.0
                    onClicked: root.closeModal()

                    background: Rectangle { color: parent.hovered ? "#252438" : "transparent"; border.color: "#20ffffff"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#c4c5d4"; font.pixelSize: 13; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }

                Item { Layout.fillWidth: true }

                Button {
                    visible: root.totalProgress < 1.0
                    Layout.preferredWidth: 160
                    Layout.preferredHeight: 38
                    text: root.isUploading ? "Processando…" : "Iniciar Importação"
                    enabled: root.folderPath.length > 0 && !root.isUploading
                    onClicked: root.startUpload()

                    background: Rectangle {
                        color: parent.enabled ? (parent.hovered ? "#4f46e5" : "#6366f1") : "#2b293d"
                        radius: 8
                    }
                    contentItem: Text {
                        text: parent.text
                        color: parent.enabled ? "#ffffff" : "#64748b"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }
    }

    Shortcut {
        sequence: "Escape"
        enabled: root.visible && (!root.isUploading || root.totalProgress === 1.0)
        onActivated: root.closeModal()
    }
}
