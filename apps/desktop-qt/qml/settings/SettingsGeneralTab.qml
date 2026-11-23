import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs
import "../ui"

Item {
    id: generalTabRoot
    Layout.fillWidth: true
    implicitHeight: contentCol.implicitHeight

    Theme { id: theme }

    property string selectedLanguage: "pt"
    property bool enableTabsWeb: true
    property bool enableTabsDesktop: true
    property bool hidePinnedNames: false
    property string videoStoragePath: ""

    signal settingsChanged()

    Component.onCompleted: {
        var lang = dataController.getConfig("app_language", "pt")
        selectedLanguage = (lang === "en" ? "en" : "pt")
        enableTabsWeb = (dataController.getConfig("app_enable_tabs_web", "true") === "true")
        enableTabsDesktop = (dataController.getConfig("app_enable_tabs_desktop", "true") === "true")
        hidePinnedNames = (dataController.getConfig("app_hide_pinned_names", "false") === "true")
        videoStoragePath = dataController.getConfig("videoStoragePath", dataController.dbPath ? dataController.dbPath.substring(0, dataController.dbPath.lastIndexOf("/")) + "/videos" : "Padrão do Sistema (AppData)")
    }

    function savePreferences() {
        dataController.setConfig("app_language", selectedLanguage)
        dataController.setConfig("app_enable_tabs_web", enableTabsWeb ? "true" : "false")
        dataController.setConfig("app_enable_tabs_desktop", enableTabsDesktop ? "true" : "false")
        dataController.setConfig("app_hide_pinned_names", hidePinnedNames ? "true" : "false")
        dataController.setConfig("videoStoragePath", videoStoragePath)
    }

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        spacing: 24

        // 1. Language Selection (Português / English)
        Rectangle {
            Layout.fillWidth: true
            radius: 12
            color: theme.bgDarkCard
            border.color: theme.borderCard
            Layout.preferredHeight: langCol.implicitHeight + 32

            ColumnLayout {
                id: langCol
                anchors.fill: parent
                anchors.margins: 16
                spacing: 12

                RowLayout {
                    spacing: 8
                    AppIcon { width: 16; height: 16; name: "settings"; color: theme.brand400 }
                    Text {
                        text: qsTr("Idioma do Aplicativo")
                        color: theme.textDark
                        font.pixelSize: 14
                        font.bold: true
                    }
                }

                Text {
                    text: qsTr("Selecione o idioma da interface visual do Synapse.")
                    color: theme.textSubtext
                    font.pixelSize: 12
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    // Option: Português
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 64
                        radius: 10
                        color: generalTabRoot.selectedLanguage === "pt" ? theme.activePillBg : theme.bgDarkSurface
                        border.color: generalTabRoot.selectedLanguage === "pt" ? theme.brand500 : theme.borderSubtle
                        border.width: generalTabRoot.selectedLanguage === "pt" ? 1.5 : 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 12

                            Rectangle {
                                width: 36; height: 36; radius: 8
                                color: generalTabRoot.selectedLanguage === "pt" ? theme.brand500 : theme.bgDarkCard
                                Text {
                                    anchors.centerIn: parent
                                    text: "PT"
                                    color: theme.textDark
                                    font.bold: true
                                    font.pixelSize: 12
                                }
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    text: "Português"
                                    color: theme.textDark
                                    font.pixelSize: 13
                                    font.bold: true
                                }
                                Text {
                                    text: "Português do Brasil"
                                    color: theme.textSubtext
                                    font.pixelSize: 11
                                }
                            }

                            AppIcon {
                                visible: generalTabRoot.selectedLanguage === "pt"
                                width: 18; height: 18
                                name: "check"
                                color: theme.brand400
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                generalTabRoot.selectedLanguage = "pt"
                                generalTabRoot.savePreferences()
                                generalTabRoot.settingsChanged()
                            }
                        }
                    }

                    // Option: English
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 64
                        radius: 10
                        color: generalTabRoot.selectedLanguage === "en" ? theme.activePillBg : theme.bgDarkSurface
                        border.color: generalTabRoot.selectedLanguage === "en" ? theme.brand500 : theme.borderSubtle
                        border.width: generalTabRoot.selectedLanguage === "en" ? 1.5 : 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 12

                            Rectangle {
                                width: 36; height: 36; radius: 8
                                color: generalTabRoot.selectedLanguage === "en" ? theme.brand500 : theme.bgDarkCard
                                Text {
                                    anchors.centerIn: parent
                                    text: "EN"
                                    color: theme.textDark
                                    font.bold: true
                                    font.pixelSize: 12
                                }
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    text: "English"
                                    color: theme.textDark
                                    font.pixelSize: 13
                                    font.bold: true
                                }
                                Text {
                                    text: "English (United States)"
                                    color: theme.textSubtext
                                    font.pixelSize: 11
                                }
                            }

                            AppIcon {
                                visible: generalTabRoot.selectedLanguage === "en"
                                width: 18; height: 18
                                name: "check"
                                color: theme.brand400
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                generalTabRoot.selectedLanguage = "en"
                                generalTabRoot.savePreferences()
                                generalTabRoot.settingsChanged()
                            }
                        }
                    }
                }
            }
        }

        // 2. Tab System Preferences (Matching React GeneralTab)
        Rectangle {
            Layout.fillWidth: true
            radius: 12
            color: theme.bgDarkCard
            border.color: theme.borderCard
            Layout.preferredHeight: tabsCol.implicitHeight + 32

            ColumnLayout {
                id: tabsCol
                anchors.fill: parent
                anchors.margins: 16
                spacing: 16

                RowLayout {
                    spacing: 8
                    AppIcon { width: 16; height: 16; name: "layout"; color: theme.brand400 }
                    Text {
                        text: qsTr("Sistema de Abas e Janelas")
                        color: theme.textDark
                        font.pixelSize: 14
                        font.bold: true
                    }
                }

                // Toggle: Tabs Web
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        Text {
                            text: qsTr("Navegação em Abas no Estilo Web")
                            color: theme.textDark
                            font.pixelSize: 13
                            font.bold: true
                        }
                        Text {
                            text: qsTr("Permite abrir notas e módulos em múltiplas abas concorrentes com histórico.")
                            color: theme.textSubtext
                            font.pixelSize: 11
                        }
                    }

                    Switch {
                        checked: generalTabRoot.enableTabsWeb
                        onToggled: {
                            generalTabRoot.enableTabsWeb = checked
                            generalTabRoot.savePreferences()
                            generalTabRoot.settingsChanged()
                        }
                    }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: theme.borderSubtle }

                // Toggle: Tabs Desktop
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        Text {
                            text: qsTr("Exibir Barra Superior de Abas")
                            color: theme.textDark
                            font.pixelSize: 13
                            font.bold: true
                        }
                        Text {
                            text: qsTr("Mantém a barra de abas visível no topo para alternância rápida entre módulos.")
                            color: theme.textSubtext
                            font.pixelSize: 11
                        }
                    }

                    Switch {
                        checked: generalTabRoot.enableTabsDesktop
                        onToggled: {
                            generalTabRoot.enableTabsDesktop = checked
                            generalTabRoot.savePreferences()
                            generalTabRoot.settingsChanged()
                        }
                    }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: theme.borderSubtle }

                // Toggle: Hide Pinned Names
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        Text {
                            text: qsTr("Ocultar Nomes em Abas Fixadas")
                            color: theme.textDark
                            font.pixelSize: 13
                            font.bold: true
                        }
                        Text {
                            text: qsTr("Exibe apenas o ícone nas abas que forem fixadas para economizar espaço horizontal.")
                            color: theme.textSubtext
                            font.pixelSize: 11
                        }
                    }

                    Switch {
                        checked: generalTabRoot.hidePinnedNames
                        onToggled: {
                            generalTabRoot.hidePinnedNames = checked
                            generalTabRoot.savePreferences()
                            generalTabRoot.settingsChanged()
                        }
                    }
                }
            }
        }

        // 3. Storage Directory (Video & Media)
        Rectangle {
            Layout.fillWidth: true
            radius: 12
            color: theme.bgDarkCard
            border.color: theme.borderCard
            Layout.preferredHeight: mediaCol.implicitHeight + 32

            ColumnLayout {
                id: mediaCol
                anchors.fill: parent
                anchors.margins: 16
                spacing: 12

                RowLayout {
                    spacing: 8
                    AppIcon { width: 16; height: 16; name: "video"; color: theme.brand400 }
                    Text {
                        text: qsTr("Diretório de Mídia e Vídeos")
                        color: theme.textDark
                        font.pixelSize: 14
                        font.bold: true
                    }
                }

                Text {
                    text: qsTr("Pasta local onde os vídeos baixados e arquivos de mídia criptografados são armazenados.")
                    color: theme.textSubtext
                    font.pixelSize: 12
                }

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
                            text: generalTabRoot.videoStoragePath
                            color: theme.textSubtext
                            font.pixelSize: 12
                            font.family: theme.fontMono
                            elide: Text.ElideMiddle
                            verticalAlignment: Text.AlignVCenter
                        }
                    }

                    Rectangle {
                        Layout.preferredWidth: 120
                        Layout.preferredHeight: 38
                        radius: 8
                        color: folderMouse.containsMouse ? theme.brand600 : theme.brand500

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            AppIcon { width: 14; height: 14; name: "folder"; color: "#ffffff" }
                            Text {
                                text: qsTr("Alterar...")
                                color: "#ffffff"
                                font.pixelSize: 12
                                font.bold: true
                            }
                        }

                        MouseArea {
                            id: folderMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: folderDialog.open()
                        }
                    }
                }
            }
        }
    }

    FolderDialog {
        id: folderDialog
        title: qsTr("Selecionar Pasta para Mídia de Vídeos")
        onAccepted: {
            var path = folderDialog.folder.toString().replace(/^file:\/\//, "")
            generalTabRoot.videoStoragePath = path
            generalTabRoot.savePreferences()
            generalTabRoot.settingsChanged()
        }
    }
}
