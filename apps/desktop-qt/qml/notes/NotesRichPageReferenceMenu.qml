pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: referenceMenu
    objectName: "notesRichPageReferenceMenu"

    property bool open: false
    property string initialQuery: ""
    property string searchQuery: ""
    property real anchorX: 0
    property real anchorY: 0
    property int selectedIndex: 0
    property var pages: []
    readonly property var filteredPages: {
        var query = searchQuery.trim().toLowerCase()
        return pages.filter(function(page) {
            return page && page.id && String(page.title || "").toLowerCase().indexOf(query) >= 0
        })
    }
    readonly property int menuHeight: 80 + (filteredPages.length === 0
        ? 48 : Math.min(260, filteredPages.length * 52))

    signal pageSelected(string pageId, string title)
    signal dismissed()

    visible: open
    z: 22
    width: parent ? Math.max(0, Math.min(320, parent.width - 16)) : 320
    height: menuHeight
    x: parent ? Math.max(8, Math.min(anchorX, parent.width - width - 8)) : anchorX
    y: {
        if (!parent) return anchorY
        return anchorY + height + 8 <= parent.height - 8
            ? Math.max(8, anchorY)
            : Math.max(8, anchorY - height - 8)
    }
    Accessible.role: Accessible.List
    Accessible.name: qsTr("Link to an existing page")
    Accessible.description: filteredPages.length === 0
        ? qsTr("No matching pages. Search by page title.")
        : qsTr("%1 matching pages. Use Up or Down to choose, Enter to link, or Escape to close.")
            .arg(filteredPages.length)
    Accessible.ignored: !visible

    function moveSelection(delta) {
        if (filteredPages.length === 0) return
        selectedIndex = (selectedIndex + delta + filteredPages.length) % filteredPages.length
    }

    function select(index) {
        if (index < 0 || index >= filteredPages.length) return
        var page = filteredPages[index]
        pageSelected(String(page.id), String(page.title || qsTr("Untitled")))
    }

    onOpenChanged: {
        if (!open) return
        searchQuery = initialQuery
        selectedIndex = 0
        Qt.callLater(function() { searchField.forceActiveFocus() })
    }
    onInitialQueryChanged: if (open) searchQuery = initialQuery
    onSearchQueryChanged: selectedIndex = 0

    Rectangle {
        anchors.fill: parent
        radius: 9
        color: "#0f0e17"
        border.color: "#14ffffff"
        clip: true
    }

    Column {
        anchors.fill: parent
        spacing: 0

        Text {
            width: parent.width
            height: 34
            leftPadding: 12
            verticalAlignment: Text.AlignVCenter
            color: "#a7a9be"
            font.pixelSize: 10
            font.weight: Font.DemiBold
            text: qsTr("LINK TO PAGE").toUpperCase()
        }

        TextField {
            id: searchField
            objectName: "notesRichPageReferenceSearchField"
            x: 8
            width: parent.width - 16
            height: 38
            placeholderText: qsTr("Search page titles…")
            text: referenceMenu.searchQuery
            color: "#fffffe"
            placeholderTextColor: "#77798c"
            selectByMouse: true
            Accessible.name: qsTr("Search existing pages")
            background: Rectangle {
                color: "#15141e"
                radius: 6
                border.color: "#18ffffff"
            }
            onTextChanged: referenceMenu.searchQuery = text
            Keys.priority: Keys.BeforeItem
            Keys.onPressed: function(event) {
                if (event.key === Qt.Key_Down || event.key === Qt.Key_Up) {
                    referenceMenu.moveSelection(event.key === Qt.Key_Down ? 1 : -1)
                    event.accepted = true
                } else if (event.key === Qt.Key_Enter || event.key === Qt.Key_Return) {
                    referenceMenu.select(referenceMenu.selectedIndex)
                    event.accepted = true
                } else if (event.key === Qt.Key_Escape) {
                    referenceMenu.dismissed()
                    event.accepted = true
                }
            }
        }

        ListView {
            id: pageList
            objectName: "notesRichPageReferenceList"
            width: parent.width
            height: Math.max(0, referenceMenu.height - 80)
            clip: true
            model: referenceMenu.filteredPages
            currentIndex: referenceMenu.selectedIndex
            boundsBehavior: Flickable.StopAtBounds

            delegate: Button {
                id: pageButton
                required property var modelData
                required property int index
                objectName: "notesRichPageReference_" + String(modelData.id)
                width: pageList.width
                height: 52
                padding: 0
                focusPolicy: Qt.NoFocus
                Accessible.name: String(modelData.title || qsTr("Untitled"))
                background: Rectangle {
                    radius: 6
                    color: pageButton.hovered || referenceMenu.selectedIndex === pageButton.index
                        ? "#1affffff" : "transparent"
                }
                contentItem: Row {
                    spacing: 10
                    x: Math.min(18 + Number(pageButton.modelData.depth || 0) * 12, 54)
                    width: Math.max(0, parent.width - x - 8)
                    height: parent.height
                    Text {
                        width: 24
                        anchors.verticalCenter: parent.verticalCenter
                        horizontalAlignment: Text.AlignHCenter
                        color: "#a7a9be"
                        font.pixelSize: 14
                        text: pageButton.modelData.icon || "📄"
                    }
                    Text {
                        width: Math.max(0, parent.width - 34)
                        anchors.verticalCenter: parent.verticalCenter
                        color: "#fffffe"
                        font.pixelSize: 12
                        elide: Text.ElideRight
                        text: pageButton.modelData.title || qsTr("Untitled")
                    }
                }
                onHoveredChanged: if (hovered) referenceMenu.selectedIndex = index
                onClicked: referenceMenu.select(index)
            }

            Text {
                anchors.centerIn: parent
                visible: referenceMenu.filteredPages.length === 0
                color: "#a7a9be"
                font.pixelSize: 11
                text: qsTr("No matching pages found")
            }
        }
    }
}
