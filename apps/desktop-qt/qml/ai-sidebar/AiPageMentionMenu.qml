import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: mentionMenuRoot
    width: 260
    height: Math.min(220, mentionList.contentHeight + 16)
    radius: 10
    color: "#161524"
    border.color: "#38354d"
    border.width: 1
    visible: false
    z: 100

    property var pagesList: []
    property string filterQuery: ""

    signal pageSelected(string pageId, string pageTitle)

    function getFilteredPages() {
        if (!pagesList || pagesList.length === 0) return []
        if (!filterQuery) return pagesList.slice(0, 8)
        var q = filterQuery.toLowerCase()
        return pagesList.filter(function(p) {
            return (p.title && p.title.toLowerCase().indexOf(q) !== -1)
        }).slice(0, 8)
    }

    ListView {
        id: mentionList
        anchors.fill: parent
        anchors.margins: 8
        clip: true
        model: mentionMenuRoot.getFilteredPages()
        spacing: 4

        delegate: Rectangle {
            width: mentionList.width
            height: 32
            radius: 6
            color: mentionMouse.containsMouse ? "#232135" : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.margins: 6
                spacing: 8

                Text { text: "📄"; font.pixelSize: 12 }
                Text {
                    text: modelData.title || "Sem título"
                    color: "#fffffe"
                    font.pixelSize: 12
                    elide: Text.ElideRight
                    Layout.fillWidth: true
                }
            }

            MouseArea {
                id: mentionMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    mentionMenuRoot.pageSelected(modelData.id, modelData.title)
                    mentionMenuRoot.visible = false
                }
            }
        }

        Text {
            anchors.centerIn: parent
            text: "Nenhuma página encontrada"
            color: "#6b7280"
            font.pixelSize: 11
            visible: mentionList.count === 0
        }
    }
}
