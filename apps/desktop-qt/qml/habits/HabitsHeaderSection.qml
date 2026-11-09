import QtQuick 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: headerRoot
    Layout.fillWidth: true
    spacing: 16

    property int habitCount: 0

    signal createHabitRequested()

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

    Rectangle {
        width: 144; height: 40; radius: 10
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
