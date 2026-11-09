import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: greetingRoot
    Layout.fillWidth: true
    spacing: 24

    property string greeting: "Bom dia"
    property string formattedDate: ""
    property int deckCount: 0
    property int habitCount: 0

    signal actionClicked(string tabKey)

    // Greeting Header
    RowLayout {
        Layout.fillWidth: true
        ColumnLayout {
            spacing: 4
            Text {
                text: greetingRoot.greeting + ", Vinícius!"
                color: "#fffffe"
                font.pixelSize: 28
                font.bold: true
            }
            Text {
                text: "Hoje é " + greetingRoot.formattedDate
                color: "#a7a9be"
                font.pixelSize: 14
            }
        }
        Item { Layout.fillWidth: true }
        Rectangle {
            width: 40; height: 40; radius: 10; color: "#1a1924"; border.color: "#ffffff12"
            Text { anchors.centerIn: parent; text: "⚡"; font.pixelSize: 18 }
        }
    }

    // Quick Actions Bar (4 Cards)
    RowLayout {
        Layout.fillWidth: true
        spacing: 12

        // Action 1: Nova Nota
        Rectangle {
            Layout.fillWidth: true
            height: 84
            radius: 12
            color: a1Mouse.containsMouse ? "#201e30" : "#1a1924"
            border.color: a1Mouse.containsMouse ? "#8b5cf680" : "#ffffff0f"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.margins: 16
                spacing: 12
                Rectangle {
                    width: 44; height: 44; radius: 10; color: "#8b5cf626"
                    Text { anchors.centerIn: parent; text: "📝"; font.pixelSize: 20 }
                }
                ColumnLayout {
                    spacing: 2
                    Text { text: "Nova Nota"; color: "#fffffe"; font.pixelSize: 14; font.bold: true }
                    Text { text: "Abrir editor em branco"; color: "#a7a9be"; font.pixelSize: 11 }
                }
            }
            MouseArea {
                id: a1Mouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: greetingRoot.actionClicked("notes")
            }
        }

        // Action 2: Flashcards
        Rectangle {
            Layout.fillWidth: true
            height: 84
            radius: 12
            color: a2Mouse.containsMouse ? "#201e30" : "#1a1924"
            border.color: a2Mouse.containsMouse ? "#6366f180" : "#ffffff0f"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.margins: 16
                spacing: 12
                Rectangle {
                    width: 44; height: 44; radius: 10; color: "#6366f126"
                    Text { anchors.centerIn: parent; text: "🎴"; font.pixelSize: 20 }
                }
                ColumnLayout {
                    spacing: 2
                    Text { text: "Revisão Anki"; color: "#fffffe"; font.pixelSize: 14; font.bold: true }
                    Text { text: greetingRoot.deckCount + " baralhos disponíveis"; color: "#a7a9be"; font.pixelSize: 11 }
                }
            }
            MouseArea {
                id: a2Mouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: greetingRoot.actionClicked("anki")
            }
        }

        // Action 3: Pomodoro Foco
        Rectangle {
            Layout.fillWidth: true
            height: 84
            radius: 12
            color: a3Mouse.containsMouse ? "#201e30" : "#1a1924"
            border.color: a3Mouse.containsMouse ? "#10b98180" : "#ffffff0f"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.margins: 16
                spacing: 12
                Rectangle {
                    width: 44; height: 44; radius: 10; color: "#10b98126"
                    Text { anchors.centerIn: parent; text: "⏳"; font.pixelSize: 20 }
                }
                ColumnLayout {
                    spacing: 2
                    Text { text: "Iniciar Foco"; color: "#fffffe"; font.pixelSize: 14; font.bold: true }
                    Text { text: "Ciclo de 25 min com Lo-Fi"; color: "#a7a9be"; font.pixelSize: 11 }
                }
            }
            MouseArea {
                id: a3Mouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: greetingRoot.actionClicked("focus")
            }
        }

        // Action 4: Hábitos Diários
        Rectangle {
            Layout.fillWidth: true
            height: 84
            radius: 12
            color: a4Mouse.containsMouse ? "#201e30" : "#1a1924"
            border.color: a4Mouse.containsMouse ? "#f59e0b80" : "#ffffff0f"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.margins: 16
                spacing: 12
                Rectangle {
                    width: 44; height: 44; radius: 10; color: "#f59e0b26"
                    Text { anchors.centerIn: parent; text: "⚡"; font.pixelSize: 20 }
                }
                ColumnLayout {
                    spacing: 2
                    Text { text: "Hábitos do Dia"; color: "#fffffe"; font.pixelSize: 14; font.bold: true }
                    Text { text: greetingRoot.habitCount + " hábitos na rotina"; color: "#a7a9be"; font.pixelSize: 11 }
                }
            }
            MouseArea {
                id: a4Mouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: greetingRoot.actionClicked("habits")
            }
        }
    }
}

