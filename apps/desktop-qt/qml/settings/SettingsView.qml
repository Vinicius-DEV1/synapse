import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: settingsRoot
    color: "#0f0e17" // bg-dark-bg

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

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
                width: 160
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
                    onClicked: dataController.refreshStats()
                }
            }
        }

        // Database Path Card
        Rectangle {
            Layout.fillWidth: true
            height: 90
            radius: 12
            color: "#1a1924"
            border.color: "#ffffff0f"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 18
                spacing: 6

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
                    Layout.fillWidth: true
                }
            }
        }

        // Metrics Grid (Counts of real SQLite data)
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

        Item { Layout.fillHeight: true }
    }
}
