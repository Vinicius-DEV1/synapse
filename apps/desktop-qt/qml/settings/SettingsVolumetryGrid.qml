import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: volumetryRoot
    Layout.fillWidth: true
    spacing: 12

    property int pageCount: 0
    property int videoCount: 0
    property int deckCount: 0
    property int bookCount: 0
    property int cultureCount: 0
    property int vaultItemCount: 0
    property int transactionCount: 0
    property int eventCount: 0
    property int habitCount: 0
    property int quizBatteryCount: 0
    property int focusSessionCount: 0

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
            Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#0fffffff"; border.width: 1
            ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                Text { text: "PÁGINAS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                Text { text: volumetryRoot.pageCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
            }
        }
        // Vídeos
        Rectangle {
            Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#0fffffff"; border.width: 1
            ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                Text { text: "VÍDEOS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                Text { text: volumetryRoot.videoCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
            }
        }
        // Baralhos Anki
        Rectangle {
            Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#0fffffff"; border.width: 1
            ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                Text { text: "BARALHOS ANKI"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                Text { text: volumetryRoot.deckCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
            }
        }
        // Livros
        Rectangle {
            Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#0fffffff"; border.width: 1
            ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                Text { text: "LIVROS / E-PUBS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                Text { text: volumetryRoot.bookCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
            }
        }
        // Cultura
        Rectangle {
            Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#0fffffff"; border.width: 1
            ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                Text { text: "CULTURA & MÍDIA"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                Text { text: volumetryRoot.cultureCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
            }
        }
        // Cofre
        Rectangle {
            Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#0fffffff"; border.width: 1
            ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                Text { text: "CREDENCIAS COFRE"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                Text { text: volumetryRoot.vaultItemCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
            }
        }
        // Transações
        Rectangle {
            Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#0fffffff"; border.width: 1
            ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                Text { text: "TRANSAÇÕES"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                Text { text: volumetryRoot.transactionCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
            }
        }
        // Eventos
        Rectangle {
            Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#0fffffff"; border.width: 1
            ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                Text { text: "AGENDA & EVENTOS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                Text { text: volumetryRoot.eventCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
            }
        }
        // Hábitos
        Rectangle {
            Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#0fffffff"; border.width: 1
            ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                Text { text: "HÁBITOS ATIVOS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                Text { text: volumetryRoot.habitCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
            }
        }
        // Baterias Quiz
        Rectangle {
            Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#0fffffff"; border.width: 1
            ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                Text { text: "BATERIAS DE QUESTÕES"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                Text { text: volumetryRoot.quizBatteryCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
            }
        }
        // Sessões de Foco
        Rectangle {
            Layout.fillWidth: true; height: 72; radius: 10; color: "#1a1924"; border.color: "#0fffffff"; border.width: 1
            ColumnLayout { anchors.fill: parent; anchors.margins: 14; spacing: 2
                Text { text: "SESSÕES DE FOCO"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1.1 }
                Text { text: volumetryRoot.focusSessionCount.toString(); color: "#fffffe"; font.pixelSize: 20; font.bold: true }
            }
        }
    }
}
