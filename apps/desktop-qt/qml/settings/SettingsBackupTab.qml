import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs 1.3
import "../ui"

Item {
    id: backupTabRoot
    Layout.fillWidth: true
    implicitHeight: contentCol.implicitHeight

    Theme { id: theme }

    property string backupDestination: ""
    property string backupType: "encrypted" // "encrypted" or "standard"
    property bool includeMedia: false
    property bool isBackingUp: false
    property string statusMessage: ""
    property bool isSuccessStatus: true

    Component.onCompleted: {
        backupDestination = dataController.getConfig("backup_last_destination", "")
    }

    function triggerBackup() {
        isBackingUp = true
        statusMessage = qsTr("Iniciando exportação segura do banco de dados SQLite...")
        isSuccessStatus = true

        var exportPath = dataController.exportDatabaseBackup(backupDestination)
        isBackingUp = false

        if (exportPath && exportPath.length > 0) {
            statusMessage = qsTr("Backup concluído com sucesso em: ") + exportPath
            isSuccessStatus = true
            dataController.setConfig("backup_last_destination", backupDestination)
        } else {
            statusMessage = qsTr("Falha ao exportar backup do banco de dados.")
            isSuccessStatus = false
        }
    }

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        spacing: 20

        // Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            RowLayout {
                spacing: 8
                AppIcon { width: 18; height: 18; name: "backup"; color: theme.brand400 }
                Text {
                    text: qsTr("Backup e Restauração de Dados")
                    color: theme.textDark
                    font.pixelSize: 15
                    font.bold: true
                }
            }

            Item { Layout.fillWidth: true }
        }

        // Status Feedback Box
        Rectangle {
            visible: backupTabRoot.statusMessage.length > 0
            Layout.fillWidth: true
            Layout.preferredHeight: 38
            radius: 8
            color: backupTabRoot.isSuccessStatus ? theme.successBg : theme.errorBg
            border.color: backupTabRoot.isSuccessStatus ? theme.successBorder : theme.errorBorder

            RowLayout {
                anchors.fill: parent
                anchors.margins: 10
                spacing: 8

                AppIcon {
                    width: 14; height: 14
                    name: backupTabRoot.isSuccessStatus ? "check" : "alert"
                    color: backupTabRoot.isSuccessStatus ? theme.success : theme.error
                }

                Text {
                    Layout.fillWidth: true
                    text: backupTabRoot.statusMessage
                    color: backupTabRoot.isSuccessStatus ? theme.success : theme.error
                    font.pixelSize: 12
                    elide: Text.ElideMiddle
                }

                Text {
                    text: "✕"
                    color: theme.textSubtext
                    font.pixelSize: 12
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: backupTabRoot.statusMessage = ""
                    }
                }
            }
        }

        // 1. Export Backup Card
        Rectangle {
            Layout.fillWidth: true
            radius: 12
            color: theme.bgDarkCard
            border.color: theme.borderCard
            Layout.preferredHeight: exportCol.implicitHeight + 32

            ColumnLayout {
                id: exportCol
                anchors.fill: parent
                anchors.margins: 16
                spacing: 16

                RowLayout {
                    spacing: 8
                    AppIcon { width: 16; height: 16; name: "hard-drive"; color: theme.brand400 }
                    Text {
                        text: qsTr("Exportar Cópia de Segurança Completa")
                        color: theme.textDark
                        font.pixelSize: 14
                        font.bold: true
                    }
                }

                Text {
                    text: qsTr("Gera uma cópia íntegra do banco SQLite local, notas, flashcards, finanças e configurações.")
                    color: theme.textSubtext
                    font.pixelSize: 12
                }

                // Destination Folder Input
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 10

                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 38
                        radius: 8
                        color: theme.bgDarkSurface
                        border.color: theme.borderSubtle

                        Text {
                            anchors.fill: parent
                            anchors.margins: 10
                            text: backupTabRoot.backupDestination.length > 0 ? backupTabRoot.backupDestination : qsTr("Pasta padrão de backups do Synapse")
                            color: backupTabRoot.backupDestination.length > 0 ? theme.textDark : theme.textMuted
                            font.pixelSize: 12
                            font.family: theme.fontMono
                            elide: Text.ElideMiddle
                            verticalAlignment: Text.AlignVCenter
                        }
                    }

                    Rectangle {
                        Layout.preferredWidth: 140
                        Layout.preferredHeight: 38
                        radius: 8
                        color: destMouse.containsMouse ? theme.bgHover : theme.bgDarkSurface
                        border.color: theme.borderSubtle

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            AppIcon { width: 14; height: 14; name: "folder"; color: theme.textDark }
                            Text {
                                text: qsTr("Escolher Pasta")
                                color: theme.textDark
                                font.pixelSize: 12
                            }
                        }

                        MouseArea {
                            id: destMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: backupFolderDialog.open()
                        }
                    }
                }

                // Include Media Checkbox
                RowLayout {
                    spacing: 10

                    CheckBox {
                        id: mediaCheck
                        checked: backupTabRoot.includeMedia
                        onToggled: backupTabRoot.includeMedia = checked
                    }

                    Text {
                        text: qsTr("Incluir arquivos de mídia, PDFs da biblioteca e gravações de áudio no backup")
                        color: theme.textDark
                        font.pixelSize: 12
                    }
                }

                // Backup Action Button
                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 42
                    radius: 8
                    color: backupBtnMouse.containsMouse ? theme.brand600 : theme.brand500

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 8
                        AppIcon { width: 16; height: 16; name: "backup"; color: "#ffffff" }
                        Text {
                            text: backupTabRoot.isBackingUp ? qsTr("Gerando cópia...") : qsTr("Criar Backup Agora")
                            color: "#ffffff"
                            font.pixelSize: 13
                            font.bold: true
                        }
                    }

                    MouseArea {
                        id: backupBtnMouse
                        anchors.fill: parent
                        enabled: !backupTabRoot.isBackingUp
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: backupTabRoot.triggerBackup()
                    }
                }
            }
        }

        // 2. Restore Warning Card
        Rectangle {
            Layout.fillWidth: true
            radius: 12
            color: theme.bgDarkCard
            border.color: theme.borderCard
            Layout.preferredHeight: restoreCol.implicitHeight + 32

            ColumnLayout {
                id: restoreCol
                anchors.fill: parent
                anchors.margins: 16
                spacing: 12

                RowLayout {
                    spacing: 8
                    AppIcon { width: 16; height: 16; name: "alert"; color: theme.warning }
                    Text {
                        text: qsTr("Restauração de Backup")
                        color: theme.textDark
                        font.pixelSize: 14
                        font.bold: true
                    }
                }

                Text {
                    text: qsTr("A restauração substitui os registros locais atuais pelo arquivo de backup importado. Recomendamos criar uma cópia de segurança antes de restaurar.")
                    color: theme.textSubtext
                    font.pixelSize: 12
                    wrapMode: Text.Wrap
                    Layout.fillWidth: true
                }

                Rectangle {
                    Layout.preferredWidth: 180
                    Layout.preferredHeight: 38
                    radius: 8
                    color: restoreMouse.containsMouse ? theme.bgHover : theme.bgDarkSurface
                    border.color: theme.borderSubtle

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 6
                        AppIcon { width: 14; height: 14; name: "hard-drive"; color: theme.textDark }
                        Text {
                            text: qsTr("Restaurar Arquivo...")
                            color: theme.textDark
                            font.pixelSize: 12
                        }
                    }

                    MouseArea {
                        id: restoreMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            backupTabRoot.statusMessage = qsTr("Para restaurar com segurança total, selecione o arquivo .db ou pasta exportada.")
                            backupTabRoot.isSuccessStatus = true
                        }
                    }
                }
            }
        }
    }

    FolderDialog {
        id: backupFolderDialog
        title: qsTr("Selecionar Pasta para Salvar Backup")
        onAccepted: {
            var path = backupFolderDialog.folder.toString().replace(/^file:\/\//, "")
            backupTabRoot.backupDestination = path
        }
    }
}
