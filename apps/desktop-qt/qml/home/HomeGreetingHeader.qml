import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: greetingRoot
    Layout.fillWidth: true
    spacing: 20

    property string greeting: "Boa noite"
    property string formattedDate: ""

    signal actionClicked(string tabKey)

    // Greeting Header matching Caderno Original
    ColumnLayout {
        Layout.fillWidth: true
        spacing: 4

        Text {
            text: greetingRoot.greeting + "!"
            color: "#ffffff"
            font.pixelSize: 30
            font.bold: true
            font.family: theme.fontFamily
        }

        Text {
            text: "Hoje é " + greetingRoot.formattedDate
            color: theme.textSubtext
            font.pixelSize: 14
            font.family: theme.fontFamily
        }
    }

    // 4 Quick Actions Bar matching Original Caderno (HomeQuickActions.tsx)
    RowLayout {
        Layout.fillWidth: true
        spacing: 14

        // 1. Nova Página
        Rectangle {
            Layout.fillWidth: true
            height: 56
            radius: 14
            color: a1Mouse.containsMouse ? "#ffffff08" : "#ffffff05"
            border.color: a1Mouse.containsMouse ? "#8b5cf64d" : theme.borderSubtle
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 14
                anchors.rightMargin: 14
                spacing: 12

                Rectangle {
                    width: 36; height: 36; radius: 18
                    color: "#8b5cf626"
                    Text { anchors.centerIn: parent; text: "+"; color: "#a78bfa"; font.pixelSize: 18; font.bold: true }
                }

                Text {
                    text: "Nova Página"
                    color: "#ffffff"
                    font.pixelSize: 13
                    font.bold: true
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
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

        // 2. Calendário
        Rectangle {
            Layout.fillWidth: true
            height: 56
            radius: 14
            color: a2Mouse.containsMouse ? "#ffffff08" : "#ffffff05"
            border.color: a2Mouse.containsMouse ? "#f59e0b4d" : theme.borderSubtle
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 14
                anchors.rightMargin: 14
                spacing: 12

                Rectangle {
                    width: 36; height: 36; radius: 18
                    color: "#f59e0b26"
                    Text { anchors.centerIn: parent; text: "📅"; font.pixelSize: 15 }
                }

                Text {
                    text: "Calendário"
                    color: "#ffffff"
                    font.pixelSize: 13
                    font.bold: true
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }

            MouseArea {
                id: a2Mouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: greetingRoot.actionClicked("calendar")
            }
        }

        // 3. Flashcards
        Rectangle {
            Layout.fillWidth: true
            height: 56
            radius: 14
            color: a3Mouse.containsMouse ? "#ffffff08" : "#ffffff05"
            border.color: a3Mouse.containsMouse ? "#3b82f64d" : theme.borderSubtle
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 14
                anchors.rightMargin: 14
                spacing: 12

                Rectangle {
                    width: 36; height: 36; radius: 18
                    color: "#3b82f626"
                    Text { anchors.centerIn: parent; text: "🎴"; font.pixelSize: 15 }
                }

                Text {
                    text: "Flashcards"
                    color: "#ffffff"
                    font.pixelSize: 13
                    font.bold: true
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }

            MouseArea {
                id: a3Mouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: greetingRoot.actionClicked("anki")
            }
        }

        // 4. Arquivos (ou Biblioteca)
        Rectangle {
            Layout.fillWidth: true
            height: 56
            radius: 14
            color: a4Mouse.containsMouse ? "#ffffff08" : "#ffffff05"
            border.color: a4Mouse.containsMouse ? "#10b9814d" : theme.borderSubtle
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 14
                anchors.rightMargin: 14
                spacing: 12

                Rectangle {
                    width: 36; height: 36; radius: 18
                    color: "#10b98126"
                    Text { anchors.centerIn: parent; text: "📁"; font.pixelSize: 15 }
                }

                Text {
                    text: "Arquivos"
                    color: "#ffffff"
                    font.pixelSize: 13
                    font.bold: true
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }

            MouseArea {
                id: a4Mouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: greetingRoot.actionClicked("library")
            }
        }
    }
}
