import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: headerRoot
    spacing: 16

    property int filteredCount: 0
    property int totalCount: 0
    property string searchQuery: ""

    signal searchTextChanged(string text)
    signal requestAddItem()
    signal helpRequested()
    signal goalsRequested()
    signal onlineSearchRequested()

    ColumnLayout {
        spacing: 4
        Text {
            text: "🎭 Cultura & Entretenimento"
            color: "#fffffe"
            font.pixelSize: 24
            font.bold: true
        }
        Text {
            text: headerRoot.filteredCount + " obra(s) listada(s) de " + headerRoot.totalCount + " catalogadas (animes, séries, filmes)"
            color: "#a7a9be"
            font.pixelSize: 13
        }
    }

    Item { Layout.fillWidth: true }

    // Search Bar
    Rectangle {
        Layout.preferredWidth: 240
        height: 40
        radius: 10
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
                    text: "Buscar por título..."
                    color: "#64748b"
                    font.pixelSize: 13
                    visible: !cultureSearchInput.text && !cultureSearchInput.activeFocus
                }
            }
        }
    }

    // Help / Guide Button
    Rectangle {
        width: 40
        height: 40
        radius: 10
        color: helpMouse.containsMouse ? "#262438" : "#15141b"
        border.color: helpMouse.containsMouse ? "#808b5cf6" : "#12ffffff"
        border.width: 1

        Text {
            anchors.centerIn: parent
            text: "?"
            color: helpMouse.containsMouse ? "#ffffff" : "#a7a9be"
            font.pixelSize: 15
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
        width: 86
        height: 40
        radius: 10
        color: goalsMouse.containsMouse ? "#262438" : "#15141b"
        border.color: goalsMouse.containsMouse ? "#808b5cf6" : "#12ffffff"
        border.width: 1

        RowLayout {
            anchors.centerIn: parent
            spacing: 4
            Text { text: "🎯"; font.pixelSize: 12 }
            Text { text: "Metas"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
        }

        MouseArea {
            id: goalsMouse
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: headerRoot.goalsRequested()
        }
    }

    // "🔍 Buscar Online" Button
    Rectangle {
        width: 116
        height: 40
        radius: 10
        color: onlineMouse.containsMouse ? "#262438" : "#15141b"
        border.color: onlineMouse.containsMouse ? "#808b5cf6" : "#12ffffff"
        border.width: 1

        RowLayout {
            anchors.centerIn: parent
            spacing: 4
            Text { text: "🌐"; font.pixelSize: 12 }
            Text { text: "Buscar Online"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
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
        width: 144
        height: 40
        radius: 10
        color: "#8b5cf6"

        RowLayout {
            anchors.centerIn: parent
            spacing: 6
            Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
            Text { text: "Adicionar Obra"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
        }

        MouseArea {
            anchors.fill: parent
            cursorShape: Qt.PointingHandCursor
            hoverEnabled: true
            onEntered: parent.color = "#7c3aed"
            onExited: parent.color = "#8b5cf6"
            onClicked: headerRoot.requestAddItem()
        }
    }
}
