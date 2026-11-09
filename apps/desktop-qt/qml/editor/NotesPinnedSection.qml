import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: pinnedSectionRoot
    Layout.fillWidth: true
    spacing: 4

    property var pinnedPages: []
    property string selectedPageId: ""

    signal pageSelected(string pageId)
    signal togglePinRequested(string pageId)

    visible: pinnedPages && pinnedPages.length > 0

    RowLayout {
        Layout.fillWidth: true
        spacing: 6
        Text { text: "📌"; font.pixelSize: 11 }
        Text {
            text: "FIXADOS"
            color: "#64748b"
            font.pixelSize: 11
            font.bold: true
            font.letterSpacing: 1.1
        }
    }

    Repeater {
        model: pinnedSectionRoot.pinnedPages

        delegate: Rectangle {
            id: pinnedDelegate
            property bool isSelected: pinnedSectionRoot.selectedPageId === modelData.id
            Layout.fillWidth: true
            height: 34
            radius: 6
            color: isSelected ? "#8b5cf61a" : (pinnedMouse.containsMouse ? "#ffffff0a" : "transparent")
            border.color: isSelected ? "#8b5cf64d" : "transparent"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                Text { text: modelData.icon || "📄"; font.pixelSize: 13 }
                Text {
                    Layout.fillWidth: true
                    text: modelData.title || "Sem título"
                    color: pinnedDelegate.isSelected ? "#c4b5fd" : (pinnedMouse.containsMouse ? "#fffffe" : "#a7a9be")
                    font.pixelSize: 13
                    font.bold: pinnedDelegate.isSelected
                    elide: Text.ElideRight
                }

                // Hover Action: Unpin
                Rectangle {
                    width: 20; height: 20; radius: 4
                    color: "transparent"
                    visible: pinnedMouse.containsMouse

                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 10 }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: pinnedSectionRoot.togglePinRequested(modelData.id)
                    }
                }
            }

            MouseArea {
                id: pinnedMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: pinnedSectionRoot.pageSelected(modelData.id)
            }
        }
    }
}
