import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: settingsRoot
    color: theme.bgDarkBg

    Theme { id: theme }

    property var diagnostics: ({})
    property string backupFeedback: ""
    property string activeAccentColor: "#8b5cf6"
    property int autoLockMinutes: 15
    property bool isHelpOpen: false
    property string activeTab: "general"
    property bool saveSuccess: false

    function updateDiagnostics() {
        diagnostics = dataController.getSystemDiagnostics()
    }

    Component.onCompleted: {
        updateDiagnostics()
    }

    Timer {
        id: saveFeedbackTimer
        interval: 3000
        repeat: false
        onTriggered: settingsRoot.saveSuccess = false
    }

    function triggerSave() {
        generalTabItem.savePreferences()
        editorTabItem.savePreferences()
        videoTabItem.savePreferences()
        dataController.setConfig("app_accent_color", activeAccentColor)
        dataController.refreshStats()
        settingsRoot.saveSuccess = true
        saveFeedbackTimer.restart()
    }

    ScrollView {
        anchors.fill: parent
        clip: true
        contentWidth: availableWidth

        ColumnLayout {
            width: Math.min(parent.width - 64, 1080)
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: 20

            Item { height: 12 } // Top padding

            // Tab Navigation Bar (10 Tabs + Todas)
            SettingsTabBar {
                activeTab: settingsRoot.activeTab
                onTabSelected: function(tabId) {
                    settingsRoot.activeTab = tabId
                }
            }

            // Tab Title and Subtitle Header
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Text {
                        text: {
                            switch (settingsRoot.activeTab) {
                            case "general": return qsTr("Configurações Gerais")
                            case "editor": return qsTr("Editor de Notas")
                            case "security": return qsTr("Segurança e Cofre")
                            case "ai": return qsTr("Inteligência Artificial")
                            case "shortcuts": return qsTr("Atalhos de Teclado")
                            case "storage": return qsTr("Armazenamento e Disco")
                            case "video": return qsTr("Vídeo e Reprodução")
                            case "backup": return qsTr("Backup e Restauração")
                            case "sync": return qsTr("Sincronização em Nuvem")
                            case "sharing": return qsTr("Compartilhamento de Páginas")
                            default: return qsTr("Todas as Configurações")
                            }
                        }
                        color: theme.textDark
                        font.pixelSize: 22
                        font.bold: true
                    }

                    Item { Layout.fillWidth: true }

                    // Help button
                    Rectangle {
                        width: 32; height: 32; radius: 8
                        color: helpMouse.containsMouse ? theme.bgHover : "transparent"
                        border.color: theme.borderSubtle

                        AppIcon {
                            anchors.centerIn: parent
                            width: 16; height: 16
                            name: "help"
                            color: theme.textSubtext
                        }

                        MouseArea {
                            id: helpMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: settingsRoot.isHelpOpen = true
                        }
                    }
                }

                Text {
                    text: {
                        switch (settingsRoot.activeTab) {
                        case "general": return qsTr("Gerencie o idioma da interface, preferências de abas e pastas de arquivos.")
                        case "editor": return qsTr("Personalize tipografia, tamanho de fontes e opções de edição do caderno.")
                        case "security": return qsTr("Controle a senha mestra do cofre, tempo de auto-bloqueio e chaves criptográficas.")
                        case "ai": return qsTr("Configure chaves de API, modelos do Gemini e parâmetros de geração do assistente.")
                        case "shortcuts": return qsTr("Consulte todos os atalhos de teclado e combinações rápidas do sistema.")
                        case "storage": return qsTr("Acompanhe o uso de disco por módulo, localização do banco SQLite e otimização.")
                        case "video": return qsTr("Ajuste aceleração por hardware, preferências de legenda e motor de vídeo.")
                        case "backup": return qsTr("Crie cópias de segurança íntegras ou restaure seus dados locais com segurança.")
                        case "sync": return qsTr("Acompanhe o monitor de sincronização e persistência Zero-Knowledge local.")
                        case "sharing": return qsTr("Gerencie páginas compartilhadas, permissões de acesso e revogação de links.")
                        default: return qsTr("Visão geral unificada de todas as opções de configuração do sistema.")
                        }
                    }
                    color: theme.textSubtext
                    font.pixelSize: 13
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: theme.borderSubtle }

            // Tab 1: General
            SettingsGeneralTab {
                id: generalTabItem
                visible: settingsRoot.activeTab === "general" || settingsRoot.activeTab === "all"
            }

            // Tab 2: Editor
            SettingsEditorTab {
                id: editorTabItem
                visible: settingsRoot.activeTab === "editor" || settingsRoot.activeTab === "all"
            }

            // Tab 3: Security & Vault
            SettingsSecurityThemeSection {
                id: securityTabItem
                visible: settingsRoot.activeTab === "security" || settingsRoot.activeTab === "all"
                autoLockMinutes: dataController.autoLockMinutes
                activeAccentColor: settingsRoot.activeAccentColor

                onAutoLockChanged: function(mins) { dataController.autoLockMinutes = mins }
                onAccentColorChanged: function(color) { settingsRoot.activeAccentColor = color }
                onSetupMasterPasswordRequested: {
                    masterPassModal.mode = "setup"
                    masterPassModal.visible = true
                }
                onChangeMasterPasswordRequested: {
                    masterPassModal.mode = "change"
                    masterPassModal.visible = true
                }
                onRemoveMasterPasswordRequested: {
                    masterPassModal.mode = "remove"
                    masterPassModal.visible = true
                }
            }

            // Tab 4: AI
            SettingsAiTab {
                id: aiTabItem
                visible: settingsRoot.activeTab === "ai" || settingsRoot.activeTab === "all"
            }

            // Tab 5: Shortcuts
            SettingsShortcutsTab {
                id: shortcutsTabItem
                visible: settingsRoot.activeTab === "shortcuts" || settingsRoot.activeTab === "all"
            }

            // Tab 6: Storage
            SettingsStorageTab {
                id: storageTabItem
                visible: settingsRoot.activeTab === "storage" || settingsRoot.activeTab === "all"
            }

            // Tab 7: Video
            SettingsVideoTab {
                id: videoTabItem
                visible: settingsRoot.activeTab === "video" || settingsRoot.activeTab === "all"
            }

            // Tab 8: Backup
            SettingsBackupTab {
                id: backupTabItem
                visible: settingsRoot.activeTab === "backup" || settingsRoot.activeTab === "all"
            }

            // Tab 9: Sync
            SettingsSyncTab {
                id: syncTabItem
                visible: settingsRoot.activeTab === "sync" || settingsRoot.activeTab === "all"
            }

            // Tab 10: Sharing
            SettingsSharingTab {
                id: sharingTabItem
                visible: settingsRoot.activeTab === "sharing" || settingsRoot.activeTab === "all"
            }

            // Global Diagnostics & Volumetry Grid when "all" is active
            SettingsHeaderSection {
                visible: settingsRoot.activeTab === "all"
                dbPath: dataController.dbPath
                diagnostics: settingsRoot.diagnostics
                backupFeedback: settingsRoot.backupFeedback

                onRefreshRequested: {
                    dataController.refreshStats()
                    settingsRoot.updateDiagnostics()
                }
                onBackupRequested: {
                    var path = dataController.exportDatabaseBackup("")
                    if (path && path.length > 0) {
                        settingsRoot.backupFeedback = "Backup salvo com sucesso: " + path
                        settingsRoot.updateDiagnostics()
                    }
                }
                onOptimizeRequested: {
                    dataController.optimizeDatabase()
                    settingsRoot.backupFeedback = "Banco de dados otimizado e WAL truncado com sucesso!"
                    settingsRoot.updateDiagnostics()
                }
                onClearFeedbackRequested: settingsRoot.backupFeedback = ""
                onHelpRequested: settingsRoot.isHelpOpen = true
            }

            // Bottom Save Action Bar (Matching React SettingsModule)
            Rectangle {
                visible: ["general", "editor", "security", "ai", "video", "all"].indexOf(settingsRoot.activeTab) !== -1
                Layout.fillWidth: true
                Layout.preferredHeight: 56
                radius: 12
                color: theme.bgDarkCard
                border.color: theme.borderCard

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 20
                    anchors.rightMargin: 20
                    spacing: 16

                    // Save Success Feedback
                    RowLayout {
                        visible: settingsRoot.saveSuccess
                        spacing: 6
                        AppIcon { width: 16; height: 16; name: "check"; color: theme.success }
                        Text {
                            text: qsTr("Configurações salvas com sucesso!")
                            color: theme.success
                            font.pixelSize: 13
                            font.bold: true
                        }
                    }

                    Item { Layout.fillWidth: true }

                    // Save Button
                    Rectangle {
                        Layout.preferredWidth: 160
                        Layout.preferredHeight: 38
                        radius: 8
                        color: saveBtnMouse.containsMouse ? theme.brand600 : theme.brand500

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 8
                            AppIcon { width: 14; height: 14; name: "check"; color: "#ffffff" }
                            Text {
                                text: qsTr("Salvar Alterações")
                                color: "#ffffff"
                                font.pixelSize: 13
                                font.bold: true
                            }
                        }

                        MouseArea {
                            id: saveBtnMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: settingsRoot.triggerSave()
                        }
                    }
                }
            }

            Item { height: 32 } // Bottom breathing room
        }
    }

    // Modal para Gerenciamento de Senha Mestra
    MasterPasswordModal {
        id: masterPassModal
        onSuccess: {
            settingsRoot.backupFeedback = qsTr("Senha mestra e segurança do cofre atualizadas com sucesso!")
            dataController.refreshStats()
        }
    }

    SettingsHelpDialog {
        isOpen: settingsRoot.isHelpOpen
        onClosed: settingsRoot.isHelpOpen = false
    }

    Shortcut {
        sequence: "Escape"
        enabled: settingsRoot.isHelpOpen || masterPassModal.visible
        onActivated: {
            if (settingsRoot.isHelpOpen) settingsRoot.isHelpOpen = false
            else if (masterPassModal.visible) masterPassModal.visible = false
        }
    }
}
