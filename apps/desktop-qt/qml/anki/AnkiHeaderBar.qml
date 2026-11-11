import QtQuick 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: headerRoot
    Layout.fillWidth: true
    spacing: 16

    property bool isShowingStats: false

    signal toggleStatsRequested()
    signal createRootDeckRequested()

    ColumnLayout {
        spacing: 4

        RowLayout {
            spacing: 10
            Text { text: "⚡"; font.pixelSize: 28; color: "#818cf8" }
            Text { text: "Flashcards"; color: "#fffffe"; font.pixelSize: 28; font.bold: true }
        }

        Text {
            text: "FSRS Spaced Repetition System • Repetição espaçada determinística com algoritmo nativo em Rust"
            color: "#a7a9be"
            font.pixelSize: 13
        }
    }

    Item { Layout.fillWidth: true }

    // "Estatísticas" Button
    Rectangle {
        width: 130; height: 40; radius: 10
        color: headerRoot.isShowingStats ? "#266366f1" : "#1a1924"
        border.color: headerRoot.isShowingStats ? "#818cf8" : "#15ffffff"
        border.width: 1

        RowLayout {
            anchors.centerIn: parent
            spacing: 8
            Text { text: "📊"; font.pixelSize: 14 }
            Text {
                text: headerRoot.isShowingStats ? "Baralhos" : "Estatísticas"
                color: headerRoot.isShowingStats ? "#a78bfa" : "#fffffe"
                font.pixelSize: 13
                font.bold: true
            }
        }

        MouseArea {
            anchors.fill: parent
            cursorShape: Qt.PointingHandCursor
            onClicked: headerRoot.toggleStatsRequested()
        }
    }

    // "+ Criar Baralho" Button
    Rectangle {
        width: 144; height: 40; radius: 10
        color: createDeckMouse.containsMouse ? "#4f46e5" : "#6366f1"

        RowLayout {
            anchors.centerIn: parent
            spacing: 8
            Text { text: "+"; color: "#ffffff"; font.pixelSize: 18; font.bold: true }
            Text { text: "Criar Baralho"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
        }

        MouseArea {
            id: createDeckMouse
            anchors.fill: parent
            cursorShape: Qt.PointingHandCursor
            hoverEnabled: true
            onClicked: headerRoot.createRootDeckRequested()
        }
    }
}
