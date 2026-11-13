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
    property string activeStatusFilter: "all"

    signal searchChanged(string text)
    signal viewModeSelected(string mode)
    signal filterSelected(string status)
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

    // Search Bar
    Rectangle {
        Layout.preferredWidth: 240
        height: 40
        radius: 10
        color: "#15141b"
        border.color: eventSearchInput.activeFocus ? "#803b82f6" : "#12ffffff"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 12
            anchors.rightMargin: 12
            spacing: 8

            Text { text: "🔍"; color: "#a7a9be"; font.pixelSize: 12 }

            TextInput {
                id: eventSearchInput
                Layout.fillWidth: true
                color: "#fffffe"
                font.pixelSize: 13
                selectByMouse: true
                onTextChanged: headerRoot.searchChanged(text)

                Text {
                    text: "Buscar compromisso..."
                    color: "#64748b"
                    font.pixelSize: 13
                    visible: !eventSearchInput.text && !eventSearchInput.activeFocus
                }
            }
        }
    }

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

    // Status Filter Tabs
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

            // Tab: Todos
            Rectangle {
                width: 70
                height: 32
                radius: 7
                color: headerRoot.activeStatusFilter === "all" ? "#262438" : "transparent"
                Text {
                    anchors.centerIn: parent
                    text: "Todos"
                    color: headerRoot.activeStatusFilter === "all" ? "#fffffe" : "#a7a9be"
                    font.pixelSize: 12
                    font.bold: headerRoot.activeStatusFilter === "all"
                }
                MouseArea {
                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                    onClicked: headerRoot.filterSelected("all")
                }
            }

            // Tab: Pendentes
            Rectangle {
                width: 80
                height: 32
                radius: 7
                color: headerRoot.activeStatusFilter === "pending" ? "#262438" : "transparent"
                Text {
                    anchors.centerIn: parent
                    text: "Pendentes"
                    color: headerRoot.activeStatusFilter === "pending" ? "#38bdf8" : "#a7a9be"
                    font.pixelSize: 12
                    font.bold: headerRoot.activeStatusFilter === "pending"
                }
                MouseArea {
                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                    onClicked: headerRoot.filterSelected("pending")
                }
            }

            // Tab: Concluídos
            Rectangle {
                width: 86
                height: 32
                radius: 7
                color: headerRoot.activeStatusFilter === "completed" ? "#262438" : "transparent"
                Text {
                    anchors.centerIn: parent
                    text: "Concluídos"
                    color: headerRoot.activeStatusFilter === "completed" ? "#34d399" : "#a7a9be"
                    font.pixelSize: 12
                    font.bold: headerRoot.activeStatusFilter === "completed"
                }
                MouseArea {
                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                    onClicked: headerRoot.filterSelected("completed")
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
