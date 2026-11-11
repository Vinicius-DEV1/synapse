import QtQuick 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: kpiRoot
    Layout.fillWidth: true
    spacing: 16

    property var summary: ({ income: 0, expense: 0, balance: 0 })

    // Card 1: Receitas
    Rectangle {
        Layout.fillWidth: true
        height: 90
        radius: 12
        color: "#1a1924"
        border.color: "#3310b981"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 4

            RowLayout {
                Text { text: "RECEITAS TOTAIS"; color: "#10b981"; font.pixelSize: 11; font.bold: true; font.letterSpacing: 1.2 }
                Item { Layout.fillWidth: true }
                Text { text: "↑"; color: "#10b981"; font.pixelSize: 14; font.bold: true }
            }

            Text {
                text: "R$ " + Number(kpiRoot.summary.income || 0).toLocaleString(Qt.locale("pt_BR"), 'f', 2)
                color: "#fffffe"
                font.pixelSize: 22
                font.bold: true
            }
        }
    }

    // Card 2: Despesas
    Rectangle {
        Layout.fillWidth: true
        height: 90
        radius: 12
        color: "#1a1924"
        border.color: "#33f43f5e"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 4

            RowLayout {
                Text { text: "DESPESAS TOTAIS"; color: "#fb7185"; font.pixelSize: 11; font.bold: true; font.letterSpacing: 1.2 }
                Item { Layout.fillWidth: true }
                Text { text: "↓"; color: "#fb7185"; font.pixelSize: 14; font.bold: true }
            }

            Text {
                text: "R$ " + Number(kpiRoot.summary.expense || 0).toLocaleString(Qt.locale("pt_BR"), 'f', 2)
                color: "#fffffe"
                font.pixelSize: 22
                font.bold: true
            }
        }
    }

    // Card 3: Saldo Líquido
    Rectangle {
        Layout.fillWidth: true
        height: 90
        radius: 12
        color: "#1a1924"
        border.color: "#4d8b5cf6"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 4

            RowLayout {
                Text { text: "SALDO LÍQUIDO"; color: "#c4b5fd"; font.pixelSize: 11; font.bold: true; font.letterSpacing: 1.2 }
                Item { Layout.fillWidth: true }
                Text { text: "●"; color: "#8b5cf6"; font.pixelSize: 12 }
            }

            Text {
                text: "R$ " + Number(kpiRoot.summary.balance || 0).toLocaleString(Qt.locale("pt_BR"), 'f', 2)
                color: kpiRoot.summary.balance >= 0 ? "#34d399" : "#fb7185"
                font.pixelSize: 22
                font.bold: true
            }
        }
    }
}
