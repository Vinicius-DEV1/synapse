import QtQuick 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: headerRoot
    Layout.fillWidth: true
    spacing: 16

    property int habitCount: 0

    signal createHabitRequested()
    signal helpRequested()

    ColumnLayout {
        spacing: 4
        Text {
            text: "⚡ Hábitos & Consistência Diária"
            color: "#fffffe"
            font.pixelSize: 24
            font.bold: true
        }
        Text {
            text: headerRoot.habitCount + " hábito(s) ativos • Matriz de ofensiva dos últimos 7 dias"
            color: "#a7a9be"
            font.pixelSize: 13
        }
    }

    Item { Layout.fillWidth: true }

    // Ajuda Button
    Rectangle {
        Layout.preferredWidth: 86
        Layout.preferredHeight: 40
        radius: 10
        color: "#161524"
        border.color: "#18ffffff"

        RowLayout {
            anchors.centerIn: parent
            spacing: 6
            Text { text: "❓"; font.pixelSize: 12 }
            Text { text: "Ajuda"; color: "#a7a9be"; font.pixelSize: 13; font.bold: true }
        }

        MouseArea {
            id: helpMouse
            anchors.fill: parent
            cursorShape: Qt.PointingHandCursor
            hoverEnabled: true
            onClicked: headerRoot.helpRequested()
        }
    }

    // Novo Hábito Button
    Rectangle {
        Layout.preferredWidth: 144
        Layout.preferredHeight: 40
        radius: 10
        color: newHabitMouse.containsMouse ? "#059669" : "#10b981"

        RowLayout {
            anchors.centerIn: parent
            spacing: 6
            Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
            Text { text: "Novo Hábito"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
        }

        MouseArea {
            id: newHabitMouse
            anchors.fill: parent
            cursorShape: Qt.PointingHandCursor
            hoverEnabled: true
            onClicked: headerRoot.createHabitRequested()
        }
    }
}
