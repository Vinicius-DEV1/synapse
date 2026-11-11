import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: tocList
    spacing: 4

    property var chapters: []
    property int currentPage: 1

    signal jumpRequested(int pageNumber)

    Repeater {
        model: tocList.chapters
        delegate: Button {
            Layout.fillWidth: true
            text: (index + 1) + ". " + (modelData.title || "Capítulo " + (index + 1))
            onClicked: tocList.jumpRequested(index + 1)
            background: Rectangle {
                color: tocList.currentPage === index + 1 ? "#302a43" : "#201f2c"
                radius: 7
                border.color: tocList.currentPage === index + 1 ? "#55447b" : "transparent"
            }
            contentItem: Text {
                text: parent.text
                color: tocList.currentPage === index + 1 ? "#ddd6fe" : "#c4c5d4"
                font.pixelSize: 10
                elide: Text.ElideRight
                verticalAlignment: Text.AlignVCenter
            }
        }
    }
}
