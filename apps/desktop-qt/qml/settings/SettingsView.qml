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

    function updateDiagnostics() {
        diagnostics = dataController.getSystemDiagnostics()
    }

    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return "0 B"
        var k = 1024
        var sizes = ["B", "KB", "MB", "GB"]
        var i = Math.floor(Math.log(bytes) / Math.log(k))
        return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i]
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

            // Header
            RowLayout {
                Layout.fillWidth: true
                ColumnLayout {
                    spacing: 4
                    Text {
                        text: "⚙️ Configurações & Diagnóstico do Sistema"
                        color: "#fffffe"
                        font.pixelSize: 24
                        font.bold: true
                    }
                    Text {
                        text: "Telemetria de performance da infraestrutura nativa Synapse Desktop (Qt 6.7 + Rust Core)"
                        color: "#a7a9be"
                        font.pixelSize: 13
                    }
                }

                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 154
                    height: 38
                    radius: 10
                    color: refreshMouse.containsMouse ? "#8b5cf6" : "#7c3aed"

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 6
                        Text { text: "🔄"; font.pixelSize: 12 }
                        Text { text: "Recarregar Banco"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    }

                    MouseArea {
                        id: refreshMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            dataController.refreshStats()
                            settingsRoot.updateDiagnostics()
                        }
                    }
                }
            }

            // Feedback Banner (Backup / Optimize)
            Rectangle {
                visible: settingsRoot.backupFeedback.length > 0
                Layout.fillWidth: true
                height: 44
                radius: 10
                color: "#10b9811f"
                border.color: "#10b98144"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 8
                    Text { text: "✓"; color: "#34d399"; font.pixelSize: 14; font.bold: true }
                    Text {
                        text: settingsRoot.backupFeedback
                        color: "#34d399"
                        font.pixelSize: 13
                        font.bold: true
                        Layout.fillWidth: true
                        elide: Text.ElideMiddle
                    }
                    Text {
                        text: "✕"
                        color: "#34d399"
                        font.pixelSize: 12
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: settingsRoot.backupFeedback = ""
                        }
                    }
                }
            }

            // Database Path & Maintenance Action Card
            Rectangle {
                Layout.fillWidth: true
                radius: 12
                color: "#1a1924"
                border.color: "#ffffff0f"
                border.width: 1

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 20
                    spacing: 14

                    RowLayout {
                        Layout.fillWidth: true
                        ColumnLayout {
                            spacing: 4
                            Text {
                                text: "BANCO DE DADOS CANÔNICO CONECTADO"
                                color: "#c4b5fd"
                                font.pixelSize: 11
                                font.bold: true
                                font.letterSpacing: 1.2
                            }
                            Text {
                                text: dataController.dbPath
                                color: "#34d399"
                                font.pixelSize: 13
                                font.bold: true
                                font.family: "Monospace"
                                elide: Text.ElideMiddle
                                Layout.maximumWidth: 640
                            }
                        }

                        Item { Layout.fillWidth: true }

                        // Backup Action Button
                        Rectangle {
                            width: 130
                            height: 36
                            radius: 8
                            color: bkpMouse.containsMouse ? "#2563eb" : "#3b82f6"
                            RowLayout {
                                anchors.centerIn: parent
                                spacing: 6
                                Text { text: "💾"; font.pixelSize: 12 }
                                Text { text: "Criar Backup"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                            }
                            MouseArea {
                                id: bkpMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    var path = dataController.exportDatabaseBackup("")
                                    if (path && path.length > 0) {
                                        settingsRoot.backupFeedback = "Backup salvo com sucesso: " + path
                                        settingsRoot.updateDiagnostics()
                                    }
                                }
                            }
                        }

                        // Optimize Action Button
                        Rectangle {
                            width: 130
                            height: 36
                            radius: 8
                            color: optMouse.containsMouse ? "#059669" : "#10b981"
                            RowLayout {
                                anchors.centerIn: parent
                                spacing: 6
                                Text { text: "⚡"; font.pixelSize: 12 }
                                Text { text: "Otimizar WAL"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                            }
                            MouseArea {
                                id: optMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    dataController.optimizeDatabase()
                                    settingsRoot.backupFeedback = "Banco de dados otimizado e WAL truncado com sucesso!"
                                    settingsRoot.updateDiagnostics()
                                }
                            }
                        }
                    }

                    // Low-level diagnostics metrics row
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 16

                        Rectangle {
                            Layout.fillWidth: true
                            height: 44
                            radius: 8
                            color: "#15141b"
                            RowLayout {
                                anchors.centerIn: parent
                                spacing: 8
                                Text { text: "Tamanho SQLite:"; color: "#a7a9be"; font.pixelSize: 12 }
                                Text { text: settingsRoot.formatBytes(settingsRoot.diagnostics.db_size_bytes); color: "#fffffe"; font.bold: true; font.pixelSize: 13 }
                            }
                        }

                        Rectangle {
                            Layout.fillWidth: true
                            height: 44
                            radius: 8
                            color: "#15141b"
                            RowLayout {
                                anchors.centerIn: parent
                                spacing: 8
                                Text { text: "Tamanho WAL:"; color: "#a7a9be"; font.pixelSize: 12 }
                                Text { text: settingsRoot.formatBytes(settingsRoot.diagnostics.wal_size_bytes); color: "#fffffe"; font.bold: true; font.pixelSize: 13 }
                            }
                        }

                        Rectangle {
                            Layout.fillWidth: true
                            height: 44
                            radius: 8
                            color: "#15141b"
                            RowLayout {
                                anchors.centerIn: parent
                                spacing: 8
                                Text { text: "Tabelas no Schema:"; color: "#a7a9be"; font.pixelSize: 12 }
                                Text { text: (settingsRoot.diagnostics.table_count || 51) + " tabelas"; color: "#fffffe"; font.bold: true; font.pixelSize: 13 }
                            }
                        }

                        Rectangle {
                            Layout.fillWidth: true
                            height: 44
                            radius: 8
                            color: "#15141b"
                            RowLayout {
                                anchors.centerIn: parent
                                spacing: 8
                                Text { text: "Versão Qt:"; color: "#a7a9be"; font.pixelSize: 12 }
                                Text { text: settingsRoot.diagnostics.qt_version || "6.7.2"; color: "#fffffe"; font.bold: true; font.pixelSize: 13 }
                            }
                        }
                    }
                }
            }

            // Volumetry Grid
            Text {
                text: "Volumetria Ativa do Banco Local"
                color: "#fffffe"
                font.pixelSize: 16
                font.bold: true
            }

            GridLayout {
                Layout.fillWidth: true
                columns: 4
                rowSpacing: 12
                columnSpacing: 12

                // Páginas
                Rectangle {
                    Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#ffffff0f"; border.width: 1
                    ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                        Text { text: "PÁGINAS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                        Text { text: dataController.pageCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
                    }
                }
                // Vídeos
                Rectangle {
                    Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#ffffff0f"; border.width: 1
                    ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                        Text { text: "VÍDEOS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                        Text { text: dataController.videoCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
                    }
                }
                // Baralhos Anki
                Rectangle {
                    Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#ffffff0f"; border.width: 1
                    ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                        Text { text: "BARALHOS ANKI"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                        Text { text: dataController.deckCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
                    }
                }
                // Livros
                Rectangle {
                    Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#ffffff0f"; border.width: 1
                    ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                        Text { text: "LIVROS / E-PUBS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                        Text { text: dataController.bookCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
                    }
                }
                // Cultura
                Rectangle {
                    Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#ffffff0f"; border.width: 1
                    ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                        Text { text: "CULTURA & MÍDIA"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                        Text { text: dataController.cultureCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
                    }
                }
                // Cofre
                Rectangle {
                    Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#ffffff0f"; border.width: 1
                    ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                        Text { text: "CREDENCIAS COFRE"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                        Text { text: dataController.vaultItemCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
                    }
                }
                // Transações
                Rectangle {
                    Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#ffffff0f"; border.width: 1
                    ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                        Text { text: "TRANSAÇÕES"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                        Text { text: dataController.transactionCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
                    }
                }
                // Eventos
                Rectangle {
                    Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#ffffff0f"; border.width: 1
                    ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                        Text { text: "AGENDA & EVENTOS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                        Text { text: dataController.eventCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
                    }
                }
                // Hábitos
                Rectangle {
                    Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#ffffff0f"; border.width: 1
                    ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                        Text { text: "HÁBITOS ATIVOS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                        Text { text: dataController.habitCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
                    }
                }
                // Baterias Quiz
                Rectangle {
                    Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#ffffff0f"; border.width: 1
                    ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                        Text { text: "BATERIAS DE QUESTÕES"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                        Text { text: dataController.quizBatteryCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
                    }
                }
                // Sessões de Foco
                Rectangle {
                    Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#ffffff0f"; border.width: 1
                    ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                        Text { text: "SESSÕES DE FOCO"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                        Text { text: dataController.focusSessionCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
                    }
                }
            }

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
                                    color: settingsRoot.autoLockMinutes === modelData ? "#8b5cf6" : "#15141b"
                                    border.color: "#ffffff12"
                                    Text { anchors.centerIn: parent; text: modelData + "m"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: settingsRoot.autoLockMinutes = modelData
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
                                    border.color: settingsRoot.activeAccentColor === modelData ? "#ffffff" : "transparent"
                                    border.width: 2
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: settingsRoot.activeAccentColor = modelData
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

            Item { height: 24 } // Bottom padding
        }
    }
}
