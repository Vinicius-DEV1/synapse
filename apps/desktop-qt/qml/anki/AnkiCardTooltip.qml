import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: tooltipRoot
    width: Math.min(260, textCol.implicitWidth + 24)
    height: textCol.implicitHeight + 16
    radius: 8
    color: "#1e1d2e"
    border.color: "#818cf8"
    border.width: 1
    z: 200
    visible: card !== null

    property var card: null

    ColumnLayout {
        id: textCol
        anchors.fill: parent
        anchors.margins: 8
        spacing: 4

        Text {
            Layout.fillWidth: true
            text: card ? (card.front || "") : ""
            color: "#ffffff"
            font.pixelSize: 11
            font.bold: true
            maximumLineCount: 3
            elide: Text.ElideRight
            wrapMode: Text.Wrap
        }

        Text {
            Layout.fillWidth: true
            text: card && card.tags ? ("🏷️ " + card.tags) : ""
            color: "#a78bfa"
            font.pixelSize: 10
            visible: text.length > 0
            elide: Text.ElideRight
        }
    }
}
