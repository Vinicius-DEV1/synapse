import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: greetingRoot
    Layout.fillWidth: true
    spacing: 20

    property string greeting: "Boa noite"
    property string formattedDate: ""
    property int dueCardsCount: 0

    signal actionClicked(string tabKey)
    signal newPageRequested()
    signal helpRequested()

    // Greeting Header matching Caderno Original
    RowLayout {
        Layout.fillWidth: true

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

        Item { Layout.fillWidth: true }
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
            color: a1Mouse.containsMouse ? "#08ffffff" : "#05ffffff"
            border.color: a1Mouse.containsMouse ? "#4d8b5cf6" : theme.borderSubtle
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 14
                anchors.rightMargin: 14
                spacing: 12

                Rectangle {
                    width: 36; height: 36; radius: 18
                    color: "#268b5cf6"
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
                onClicked: greetingRoot.newPageRequested()
            }
        }

        // 2. Calendário
        Rectangle {
            Layout.fillWidth: true
            height: 56
            radius: 14
            color: a2Mouse.containsMouse ? "#08ffffff" : "#05ffffff"
            border.color: a2Mouse.containsMouse ? "#4df59e0b" : theme.borderSubtle
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 14
                anchors.rightMargin: 14
                spacing: 12

                Rectangle {
                    width: 36; height: 36; radius: 18
                    color: "#26f59e0b"
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
            color: a3Mouse.containsMouse ? "#08ffffff" : "#05ffffff"
            border.color: a3Mouse.containsMouse ? "#4d3b82f6" : theme.borderSubtle
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 14
                anchors.rightMargin: 14
                spacing: 12

                Rectangle {
                    width: 36; height: 36; radius: 18
                    color: "#263b82f6"
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

                Rectangle {
                    visible: greetingRoot.dueCardsCount > 0
                    Layout.preferredWidth: dueText.implicitWidth + 14
                    height: 20
                    radius: 10
                    color: "#263b82f6"
                    border.color: "#503b82f6"
                    Text {
                        id: dueText
                        anchors.centerIn: parent
                        text: greetingRoot.dueCardsCount + " a rever"
                        color: "#93c5fd"
                        font.pixelSize: 10
                        font.bold: true
                    }
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
            color: a4Mouse.containsMouse ? "#08ffffff" : "#05ffffff"
            border.color: a4Mouse.containsMouse ? "#4d10b981" : theme.borderSubtle
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 14
                anchors.rightMargin: 14
                spacing: 12

                Rectangle {
                    width: 36; height: 36; radius: 18
                    color: "#2610b981"
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
