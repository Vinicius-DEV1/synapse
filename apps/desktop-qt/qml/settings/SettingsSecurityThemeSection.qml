import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: secThemeRoot
    Layout.fillWidth: true
    spacing: 16

    property int autoLockMinutes: 15
    property string activeAccentColor: "#8b5cf6"

    signal autoLockChanged(int minutes)
    signal accentColorChanged(string color)
    signal setupMasterPasswordRequested()
    signal changeMasterPasswordRequested()
    signal removeMasterPasswordRequested()
    signal lockNowRequested()

    // Vault Security & Appearance Row
    RowLayout {
        Layout.fillWidth: true
        spacing: 16

        // Vault Security Settings
        Rectangle {
            Layout.fillWidth: true
            height: 195
            radius: 12
            color: "#1a1924"
            border.color: "#ffffff0f"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 18
                spacing: 10

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "🔒 SEGURANÇA DO COFRE & CRIPTOGRAFIA"
                        color: "#c4b5fd"
                        font.pixelSize: 11
                        font.bold: true
                        font.letterSpacing: 1.1
                    }
                    Item { Layout.fillWidth: true }
                    Rectangle {
                        height: 22
                        width: statusText.contentWidth + 16
                        radius: 11
                        color: dataController.isVaultConfigured
                            ? (dataController.isVaultUnlocked ? "#10b98126" : "#f59e0b26")
                            : "#ffffff12"
                        border.color: dataController.isVaultConfigured
                            ? (dataController.isVaultUnlocked ? "#10b98150" : "#f59e0b50")
                            : "#ffffff20"
                        Text {
                            id: statusText
                            anchors.centerIn: parent
                            text: dataController.isVaultConfigured
                                ? (dataController.isVaultUnlocked ? "✓ Desbloqueado" : "🔒 Bloqueado")
                                : "Modo Plaintext"
                            color: dataController.isVaultConfigured
                                ? (dataController.isVaultUnlocked ? "#34d399" : "#fbbf24")
                                : "#a7a9be"
                            font.pixelSize: 11
                            font.bold: true
                        }
                    }
                }

                Text {
                    text: "PBKDF2 HMAC-SHA256 (600.000 iterações NIST SP 800-132) + AES-256-GCM Two-Tier"
                    color: "#fffffe"
                    font.pixelSize: 12
                }

                RowLayout {
                    spacing: 8
                    Text { text: "Bloqueio Automático:"; color: "#a7a9be"; font.pixelSize: 12 }
                    Repeater {
                        model: [1, 5, 15, 30, 0]
                        Rectangle {
                            width: modelData === 0 ? 52 : 44
                            height: 26; radius: 6
                            color: dataController.autoLockMinutes === modelData ? "#8b5cf6" : "#15141b"
                            border.color: "#ffffff12"
                            Text {
                                anchors.centerIn: parent
                                text: modelData === 0 ? "Nunca" : (modelData + "m")
                                color: "#ffffff"; font.pixelSize: 11; font.bold: true
                            }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    dataController.autoLockMinutes = modelData
                                    secThemeRoot.autoLockChanged(modelData)
                                }
                            }
                        }
                    }
                }

                // Password lifecycle actions
                RowLayout {
                    spacing: 8
                    visible: dataController.isVaultConfigured

                    Rectangle {
                        visible: dataController.isVaultUnlocked
                        width: 110; height: 30; radius: 6
                        color: lockNowMouse.containsMouse ? "#ef444433" : "#ef444420"
                        border.color: "#ef444440"
                        Text { anchors.centerIn: parent; text: "🔒 Bloquear"; color: "#fca5a5"; font.pixelSize: 11; font.bold: true }
                        MouseArea {
                            id: lockNowMouse
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            hoverEnabled: true
                            onClicked: dataController.lockVault()
                        }
                    }

                    Rectangle {
                        width: 120; height: 30; radius: 6
                        color: changePassMouse.containsMouse ? "#8b5cf640" : "#8b5cf626"
                        border.color: "#8b5cf650"
                        Text { anchors.centerIn: parent; text: "🔑 Alterar Senha"; color: "#c4b5fd"; font.pixelSize: 11; font.bold: true }
                        MouseArea {
                            id: changePassMouse
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            hoverEnabled: true
                            onClicked: secThemeRoot.changeMasterPasswordRequested()
                        }
                    }

                    Rectangle {
                        width: 120; height: 30; radius: 6
                        color: removePassMouse.containsMouse ? "#3f3f46" : "#27272a"
                        border.color: "#ffffff18"
                        Text { anchors.centerIn: parent; text: "Remover Proteção"; color: "#d4d4d8"; font.pixelSize: 11 }
                        MouseArea {
                            id: removePassMouse
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            hoverEnabled: true
                            onClicked: secThemeRoot.removeMasterPasswordRequested()
                        }
                    }
                }

                // Setup password button when not configured
                Rectangle {
                    visible: !dataController.isVaultConfigured
                    width: 180; height: 32; radius: 8
                    color: setupPassMouse.containsMouse ? "#7c3aed" : "#8b5cf6"
                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 6
                        Text { text: "🔒"; font.pixelSize: 12 }
                        Text { text: "Configurar Senha Mestra"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    }
                    MouseArea {
                        id: setupPassMouse
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        hoverEnabled: true
                        onClicked: secThemeRoot.setupMasterPasswordRequested()
                    }
                }
            }
        }

        // Appearance & Theme Accent
        Rectangle {
            Layout.fillWidth: true
            height: 195
            radius: 12
            color: "#1a1924"
            border.color: "#ffffff0f"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 18
                spacing: 8

                Text {
                    text: "🎨 TEMA VISUAL & DESTAQUE (ACCENT COLOR)"
                    color: "#c4b5fd"
                    font.pixelSize: 11
                    font.bold: true
                    font.letterSpacing: 1.1
                }

                Text {
                    text: "Tema Escuro Imersivo Caderno (#0f0e17) com alto contraste ergonômico"
                    color: "#fffffe"
                    font.pixelSize: 12
                }

                RowLayout {
                    spacing: 12
                    Repeater {
                        model: ["#8b5cf6", "#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#0284c7"]
                        Rectangle {
                            width: 28; height: 28; radius: 14
                            color: modelData
                            border.color: secThemeRoot.activeAccentColor === modelData ? "#ffffff" : "transparent"
                            border.width: 2
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: secThemeRoot.accentColorChanged(modelData)
                            }
                        }
                    }
                }
            }
        }
    }

    // Engine Status Badges
    Text {
        text: "Motores Nativos Integrados"
        color: "#fffffe"
        font.pixelSize: 16
        font.bold: true
    }

    RowLayout {
        Layout.fillWidth: true
        spacing: 12

        Rectangle {
            Layout.fillWidth: true; height: 50; radius: 10; color: "#1a1924"; border.color: "#10b98133"; border.width: 1
            RowLayout { anchors.centerIn: parent; spacing: 8
                Text { text: "●"; color: "#10b981"; font.pixelSize: 12 }
                Text { text: "SQLite WAL: Pool Ativo"; color: "#fffffe"; font.bold: true; font.pixelSize: 13 }
            }
        }

        Rectangle {
            Layout.fillWidth: true; height: 50; radius: 10; color: "#1a1924"; border.color: "#10b98133"; border.width: 1
            RowLayout { anchors.centerIn: parent; spacing: 8
                Text { text: "●"; color: "#10b981"; font.pixelSize: 12 }
                Text { text: "libmpv: GPU hwdec=auto-safe"; color: "#fffffe"; font.bold: true; font.pixelSize: 13 }
            }
        }

        Rectangle {
            Layout.fillWidth: true; height: 50; radius: 10; color: "#1a1924"; border.color: "#10b98133"; border.width: 1
            RowLayout { anchors.centerIn: parent; spacing: 8
                Text { text: "●"; color: "#10b981"; font.pixelSize: 12 }
                Text { text: "FSRS v5: Algoritmo Puro Rust"; color: "#fffffe"; font.bold: true; font.pixelSize: 13 }
            }
        }

        Rectangle {
            Layout.fillWidth: true; height: 50; radius: 10; color: "#1a1924"; border.color: "#10b98133"; border.width: 1
            RowLayout { anchors.centerIn: parent; spacing: 8
                Text { text: "●"; color: "#10b981"; font.pixelSize: 12 }
                Text { text: "E2EE: AES-256-GCM Two-Tier"; color: "#fffffe"; font.bold: true; font.pixelSize: 13 }
            }
        }
    }
}
