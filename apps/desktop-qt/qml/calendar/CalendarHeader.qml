import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: headerRoot
    Layout.fillWidth: true
    spacing: 16

    property int filteredCount: 0
    property int totalCount: 0
    property string viewMode: "grid"

    signal viewModeSelected(string mode)
    signal createEventRequested()
    signal helpRequested()

    ColumnLayout {
        spacing: 4
        Text {
            text: "📅 Calendário & Agenda de Compromissos"
            color: "#fffffe"
            font.pixelSize: 24
            font.bold: true
        }
        Text {
            text: headerRoot.filteredCount + " compromisso(s) listado(s) de " + headerRoot.totalCount + " no total"
            color: "#a7a9be"
            font.pixelSize: 13
        }
    }

    Item { Layout.fillWidth: true }

    // View Switcher (Grid vs List)
    Rectangle {
        height: 40
        radius: 10
        color: "#15141b"
        border.color: "#12ffffff"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.margins: 4
            spacing: 4

            Rectangle {
                width: 76; height: 32; radius: 7
                color: headerRoot.viewMode === "grid" ? "#262438" : "transparent"
                Text { anchors.centerIn: parent; text: "📅 Mês"; color: headerRoot.viewMode === "grid" ? "#fffffe" : "#a7a9be"; font.pixelSize: 12; font.bold: true }
                MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: headerRoot.viewModeSelected("grid") }
            }

            Rectangle {
                width: 76; height: 32; radius: 7
                color: headerRoot.viewMode === "list" ? "#262438" : "transparent"
                Text { anchors.centerIn: parent; text: "📋 Lista"; color: headerRoot.viewMode === "list" ? "#fffffe" : "#a7a9be"; font.pixelSize: 12; font.bold: true }
                MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: headerRoot.viewModeSelected("list") }
            }
        }
    }

    // Help / Guide Button
    Rectangle {
        width: 40
        height: 40
        radius: 10
        color: helpMouse.containsMouse ? "#262438" : "#15141b"
        border.color: helpMouse.containsMouse ? "#803b82f6" : "#12ffffff"
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

    // "+ Novo Evento" Button
    Rectangle {
        width: 136
        height: 40
        radius: 10
        color: "#3b82f6" // blue-600

        RowLayout {
            anchors.centerIn: parent
            spacing: 6
            Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
            Text { text: "Novo Evento"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
        }

        MouseArea {
            anchors.fill: parent
            cursorShape: Qt.PointingHandCursor
            hoverEnabled: true
            onEntered: parent.color = "#2563eb"
            onExited: parent.color = "#3b82f6"
            onClicked: headerRoot.createEventRequested()
        }
    }
}
