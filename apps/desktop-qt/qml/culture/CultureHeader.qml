import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: headerRoot
    spacing: 12

    property int filteredCount: 0
    property int totalCount: 0
    property string searchQuery: ""

    signal searchTextChanged(string text)
    signal requestAddItem()
    signal helpRequested()
    signal goalsRequested()
    signal onlineSearchRequested()

    // Row 1: Title & Action Buttons
    RowLayout {
        Layout.fillWidth: true
        spacing: 12

        ColumnLayout {
            spacing: 2
            Layout.fillWidth: true

            Text {
                text: "🎭 Cultura & Entretenimento"
                color: "#fffffe"
                font.pixelSize: 22
                font.bold: true
            }
            Text {
                text: headerRoot.filteredCount + " obra(s) listada(s) de " + headerRoot.totalCount + " catalogadas (animes, séries, filmes)"
                color: "#a7a9be"
                font.pixelSize: 12
            }
        }

        Item { Layout.fillWidth: true }

        // Action Buttons Row
        RowLayout {
            spacing: 8

            // Help / Guide Button
            Rectangle {
                Layout.preferredWidth: 36
                Layout.preferredHeight: 36
                radius: 8
                color: helpMouse.containsMouse ? "#262438" : "#15141b"
                border.color: helpMouse.containsMouse ? "#808b5cf6" : "#12ffffff"
                border.width: 1

                Text {
                    anchors.centerIn: parent
                    text: "?"
                    color: helpMouse.containsMouse ? "#ffffff" : "#a7a9be"
                    font.pixelSize: 14
                    font.bold: true
                }

                MouseArea {
                    id: helpMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: headerRoot.helpRequested()
                }
            }

            // "🎯 Metas" Button
            Rectangle {
                Layout.preferredWidth: 84
                Layout.preferredHeight: 36
                radius: 8
                color: goalsMouse.containsMouse ? "#262438" : "#15141b"
                border.color: goalsMouse.containsMouse ? "#808b5cf6" : "#12ffffff"
                border.width: 1

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 4
                    Text { text: "🎯"; font.pixelSize: 11 }
                    Text { text: "Metas"; color: "#fffffe"; font.pixelSize: 11; font.bold: true }
                }

                MouseArea {
                    id: goalsMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: headerRoot.goalsRequested()
                }
            }

            // "🌐 Buscar Online" Button
            Rectangle {
                Layout.preferredWidth: 114
                Layout.preferredHeight: 36
                radius: 8
                color: onlineMouse.containsMouse ? "#262438" : "#15141b"
                border.color: onlineMouse.containsMouse ? "#808b5cf6" : "#12ffffff"
                border.width: 1

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 4
                    Text { text: "🌐"; font.pixelSize: 11 }
                    Text { text: "Buscar Online"; color: "#fffffe"; font.pixelSize: 11; font.bold: true }
                }

                MouseArea {
                    id: onlineMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: headerRoot.onlineSearchRequested()
                }
            }

            // "+ Adicionar Obra" Button
            Rectangle {
                Layout.preferredWidth: 136
                Layout.preferredHeight: 36
                radius: 8
                color: addMouse.containsMouse ? "#7c3aed" : "#8b5cf6"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 5
                    Text { text: "+"; color: "#ffffff"; font.pixelSize: 15; font.bold: true }
                    Text { text: "Adicionar Obra"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                }

                MouseArea {
                    id: addMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: headerRoot.requestAddItem()
                }
            }
        }
    }

    // Row 2: Search Bar
    Rectangle {
        Layout.fillWidth: true
        Layout.preferredHeight: 38
        radius: 8
        color: "#15141b"
        border.color: cultureSearchInput.activeFocus ? "#808b5cf6" : "#12ffffff"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 12
            anchors.rightMargin: 12
            spacing: 8

            Text { text: "🔍"; color: "#a7a9be"; font.pixelSize: 12 }

            TextInput {
                id: cultureSearchInput
                Layout.fillWidth: true
                color: "#fffffe"
                font.pixelSize: 13
                selectByMouse: true
                text: headerRoot.searchQuery
                onTextChanged: headerRoot.searchTextChanged(text)

                Text {
                    text: "Buscar por título, gênero ou sinopse..."
                    color: "#64748b"
                    font.pixelSize: 13
                    visible: !cultureSearchInput.text && !cultureSearchInput.activeFocus
                    anchors.verticalCenter: parent.verticalCenter
                }
            }
        }
    }
}
