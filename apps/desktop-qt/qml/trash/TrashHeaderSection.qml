import QtQuick 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: headerRoot
    Layout.fillWidth: true
    spacing: 16

    property int allCount: 0

    signal emptyTrashRequested()

    ColumnLayout {
        spacing: 4
        Text {
            text: "🗑️ Lixeira do Sistema"
            color: "#fffffe"
            font.pixelSize: 24
            font.bold: true
        }
        Text {
            text: headerRoot.allCount + " item(ns) na lixeira • Itens excluídos podem ser restaurados ou apagados permanentemente."
            color: "#a7a9be"
            font.pixelSize: 13
        }
    }

    Item { Layout.fillWidth: true }

    // Empty Trash Button
    Rectangle {
        width: 140
        height: 38
        radius: 10
        color: emptyMouse.containsMouse ? "#e11d48" : "#f43f5e"
        visible: headerRoot.allCount > 0

        RowLayout {
            anchors.centerIn: parent
            spacing: 6
            Text { text: "💥"; font.pixelSize: 12 }
            Text { text: "Esvaziar Lixeira"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
        }

        MouseArea {
            id: emptyMouse
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: headerRoot.emptyTrashRequested()
        }
    }
}
