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

    // Vault Security & Appearance Row
    RowLayout {
        Layout.fillWidth: true
        spacing: 16

        // Vault Security Settings
        Rectangle {
            Layout.fillWidth: true
            height: 140
            radius: 12
            color: "#1a1924"
            border.color: "#ffffff0f"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 18
                spacing: 8

                Text {
                    text: "🔒 SEGURANÇA DO COFRE & CRIPTOGRAFIA"
                    color: "#c4b5fd"
                    font.pixelSize: 11
                    font.bold: true
                    font.letterSpacing: 1.1
                }

                Text {
                    text: "PBKDF2 SHA-256: 100.000 iterações com Salt exclusivo por registro"
                    color: "#fffffe"
                    font.pixelSize: 12
                }

                RowLayout {
                    spacing: 8
                    Text { text: "Bloqueio Automático:"; color: "#a7a9be"; font.pixelSize: 12 }
                    Repeater {
                        model: [5, 15, 30, 60]
                        Rectangle {
                            width: 44; height: 26; radius: 6
                            color: secThemeRoot.autoLockMinutes === modelData ? "#8b5cf6" : "#15141b"
                            border.color: "#ffffff12"
                            Text { anchors.centerIn: parent; text: modelData + "m"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: secThemeRoot.autoLockChanged(modelData)
                            }
                        }
                    }
                }
            }
        }

        // Appearance & Theme Accent
        Rectangle {
            Layout.fillWidth: true
            height: 140
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
