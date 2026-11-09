import QtQuick 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: kpiRoot
    Layout.fillWidth: true
    spacing: 16

    property var globalStats: ({})

    // 1. Total Cards
    Rectangle {
        Layout.fillWidth: true
        height: 104
        radius: 14
        color: "#1a1924"
        border.color: "#ffffff0d"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 16
            RowLayout {
                spacing: 8
                Rectangle {
                    width: 28; height: 28; radius: 6; color: "#6366f120"
                    Text { anchors.centerIn: parent; text: "🧠"; font.pixelSize: 14 }
                }
                Text { text: "Total de Cartões"; color: "#a7a9be"; font.pixelSize: 12 }
            }
            Text {
                text: (kpiRoot.globalStats.total_cards || 0).toString()
                color: "#fffffe"
                font.pixelSize: 24
                font.bold: true
            }
        }
    }

    // 2. Total Reviews
    Rectangle {
        Layout.fillWidth: true
        height: 104
        radius: 14
        color: "#1a1924"
        border.color: "#ffffff0d"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 16
            RowLayout {
                spacing: 8
                Rectangle {
                    width: 28; height: 28; radius: 6; color: "#38bdf820"
                    Text { anchors.centerIn: parent; text: "⚡"; font.pixelSize: 14 }
                }
                Text { text: "Total de Revisões"; color: "#a7a9be"; font.pixelSize: 12 }
            }
            Text {
                text: (kpiRoot.globalStats.total_reviews || 0).toString()
                color: "#fffffe"
                font.pixelSize: 24
                font.bold: true
            }
        }
    }

    // 3. Retention Rate
    Rectangle {
        Layout.fillWidth: true
        height: 104
        radius: 14
        color: "#1a1924"
        border.color: "#ffffff0d"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 16
            RowLayout {
                spacing: 8
                Rectangle {
                    width: 28; height: 28; radius: 6; color: "#10b98120"
                    Text { anchors.centerIn: parent; text: "🎯"; font.pixelSize: 14 }
                }
                Text { text: "Taxa de Retenção"; color: "#a7a9be"; font.pixelSize: 12 }
            }
            Text {
                text: Number(kpiRoot.globalStats.retention_rate || 90.0).toFixed(1) + "%"
                color: "#34d399"
                font.pixelSize: 24
                font.bold: true
            }
        }
    }

    // 4. Avg Stability
    Rectangle {
        Layout.fillWidth: true
        height: 104
        radius: 14
        color: "#1a1924"
        border.color: "#ffffff0d"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 16
            RowLayout {
                spacing: 8
                Rectangle {
                    width: 28; height: 28; radius: 6; color: "#f59e0b20"
                    Text { anchors.centerIn: parent; text: "⏱️"; font.pixelSize: 14 }
                }
                Text { text: "Estabilidade Média"; color: "#a7a9be"; font.pixelSize: 12 }
            }
            RowLayout {
                spacing: 6
                Text {
                    text: Number(kpiRoot.globalStats.avg_stability || 0.0).toFixed(1)
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
                Text { text: "dias"; color: "#a7a9be"; font.pixelSize: 12 }
            }
        }
    }
}
