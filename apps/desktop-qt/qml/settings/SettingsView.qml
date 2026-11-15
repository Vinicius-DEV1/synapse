import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: settingsRoot
    color: "#0f0e17" // bg-dark-bg

    property var diagnostics: ({})
    property string backupFeedback: ""
    property string activeAccentColor: "#8b5cf6"
    property int autoLockMinutes: 15
    property bool isHelpOpen: false

    function updateDiagnostics() {
        diagnostics = dataController.getSystemDiagnostics()
    }

    Component.onCompleted: {
        updateDiagnostics()
    }

    ScrollView {
        anchors.fill: parent
        clip: true
        contentWidth: availableWidth

        ColumnLayout {
            width: Math.min(parent.width - 64, 1080)
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: 24

            Item { height: 16 } // Top padding

            // Header, Database Path & Diagnostics Card
            SettingsHeaderSection {
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

            // Volumetry Grid
            SettingsVolumetryGrid {
                pageCount: dataController.pageCount
                videoCount: dataController.videoCount
                deckCount: dataController.deckCount
                bookCount: dataController.bookCount
                cultureCount: dataController.cultureCount
                vaultItemCount: dataController.vaultItemCount
                transactionCount: dataController.transactionCount
                eventCount: dataController.eventCount
                habitCount: dataController.habitCount
                quizBatteryCount: dataController.quizBatteryCount
                focusSessionCount: dataController.focusSessionCount
            }

            // Vault Security & Appearance Row + Engine Status Badges
            SettingsSecurityThemeSection {
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

            // AI API Key Pool & Models
            SettingsAiTab {
            }

            // Editor Typography & Preferences
            SettingsEditorTab {
            }

            // Zero-Knowledge Cloud Sync Configuration
            SettingsSyncTab {
            }

            Item { height: 24 } // Bottom padding
        }
    }

    // Modal para Gerenciamento de Senha Mestra
    MasterPasswordModal {
        id: masterPassModal
        onSuccess: {
            settingsRoot.backupFeedback = "Senha mestra e segurança do cofre atualizadas com sucesso!"
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
