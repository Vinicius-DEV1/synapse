import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: headerRoot
    Layout.fillWidth: true
    spacing: 24

    property string dbPath: ""
    property var diagnostics: ({})
    property string backupFeedback: ""

    signal refreshRequested()
    signal backupRequested()
    signal optimizeRequested()
    signal clearFeedbackRequested()

    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return "0 B"
        var k = 1024
        var sizes = ["B", "KB", "MB", "GB"]
        var i = Math.floor(Math.log(bytes) / Math.log(k))
        return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i]
    }

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
                onClicked: headerRoot.refreshRequested()
            }
        }
    }

    // Feedback Banner (Backup / Optimize)
    Rectangle {
        visible: headerRoot.backupFeedback.length > 0
        Layout.fillWidth: true
        height: 44
        radius: 10
        color: "#1f10b981"
        border.color: "#4410b981"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.margins: 12
            spacing: 8
            Text { text: "✓"; color: "#34d399"; font.pixelSize: 14; font.bold: true }
            Text {
                text: headerRoot.backupFeedback
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
                    onClicked: headerRoot.clearFeedbackRequested()
                }
            }
        }
    }

    // Database Path & Maintenance Action Card
    Rectangle {
        Layout.fillWidth: true
        radius: 12
        color: "#1a1924"
        border.color: "#0fffffff"
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
                        text: headerRoot.dbPath
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
                        onClicked: headerRoot.backupRequested()
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
                        onClicked: headerRoot.optimizeRequested()
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
                        Text { text: headerRoot.formatBytes(headerRoot.diagnostics.db_size_bytes); color: "#fffffe"; font.bold: true; font.pixelSize: 13 }
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
                        Text { text: headerRoot.formatBytes(headerRoot.diagnostics.wal_size_bytes); color: "#fffffe"; font.bold: true; font.pixelSize: 13 }
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
                        Text { text: (headerRoot.diagnostics.table_count || 51) + " tabelas"; color: "#fffffe"; font.bold: true; font.pixelSize: 13 }
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
                        Text { text: headerRoot.diagnostics.qt_version || "6.7.2"; color: "#fffffe"; font.bold: true; font.pixelSize: 13 }
                    }
                }
            }
        }
    }
}
