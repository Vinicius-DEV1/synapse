pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: referenceMenu
    objectName: "notesRichPageReferenceMenu"

    property bool open: false
    property string initialQuery: ""
    property string mode: "link"
    property string searchQuery: ""
    property string errorMessage: ""
    property string searchErrorMessage: ""
    property bool searchPending: false
    property real anchorX: 0
    property real anchorY: 0
    property int selectedIndex: 0
    property var pages: []
    property var contentMatches: []
    readonly property var filteredPages: {
        var query = searchQuery.trim().toLowerCase()
        var contentIds = ({})
        for (var i = 0; i < contentMatches.length; ++i) {
            var matchId = String(contentMatches[i].id || "")
            if (matchId.length > 0) contentIds[matchId] = true
        }
        return pages.filter(function(page) {
            return page && page.id && (String(page.title || "").toLowerCase().indexOf(query) >= 0 ||
                Boolean(contentIds[String(page.id)]))
        })
    }
    readonly property string effectiveTitle: searchQuery.trim() || qsTr("Untitled")
    readonly property var options: {
        var result = filteredPages.slice()
        var createOption = {
            id: "new",
            title: qsTr("Create ‘%1’").arg(effectiveTitle),
            icon: "✨",
            createNew: true
        }
        if (mode === "create") result.unshift(createOption)
        else if (searchQuery.trim().length > 0) result.push(createOption)
        return result
    }
    readonly property string visibleErrorMessage: searchErrorMessage || errorMessage
    readonly property int footerHeight: visibleErrorMessage.length > 0 ? 36 : 0
    readonly property int menuHeight: Math.min(320, 68 + (options.length === 0
        ? 48 : Math.min(240, options.length * 48)) + footerHeight)

    signal pageSelected(string pageId, string title, bool createNew)
    signal dismissed()
    signal searchQueryEdited(string query)

    visible: open
    z: 22
    width: parent ? Math.max(0, Math.min(288, parent.width - 16)) : 288
    height: menuHeight
    x: parent ? Math.max(8, Math.min(anchorX, parent.width - width - 8)) : anchorX
    y: {
        if (!parent) return anchorY
        return anchorY + height + 8 <= parent.height - 8
            ? Math.max(8, anchorY)
            : Math.max(8, anchorY - height - 8)
    }
    Accessible.role: Accessible.List
    Accessible.name: mode === "create" ? qsTr("Create a linked page") : qsTr("Link to a page")
    Accessible.description: searchPending
        ? qsTr("Searching page titles and content.")
        : options.length === 0
        ? qsTr("No matching pages. Search by page title or content.")
        : qsTr("%1 choices. Use Up or Down to choose, Enter to continue, or Escape to close.")
            .arg(options.length)
    Accessible.ignored: !visible

    function moveSelection(delta) {
        if (options.length === 0) return
        selectedIndex = (selectedIndex + delta + options.length) % options.length
    }

    function select(index) {
        if (index < 0 || index >= options.length) return
        var page = options[index]
        pageSelected(String(page.id), page.createNew ? effectiveTitle : String(page.title || qsTr("Untitled")),
                     Boolean(page.createNew))
    }

    onOpenChanged: {
        if (!open) return
        searchQuery = initialQuery
        selectedIndex = 0
        errorMessage = ""
        searchErrorMessage = ""
        Qt.callLater(function() { searchField.forceActiveFocus() })
    }
    onInitialQueryChanged: if (open) searchQuery = initialQuery
    onSearchQueryChanged: selectedIndex = 0

    Rectangle {
        anchors.fill: parent
        radius: 8
        color: "#0f0e17"
        border.color: "#0fffffff"
        clip: true
    }

    Column {
        anchors.fill: parent
        spacing: 0

        Text {
            width: parent.width
            height: 32
            leftPadding: 12
            verticalAlignment: Text.AlignVCenter
            color: "#a7a9be"
            font.pixelSize: 12
            font.weight: Font.DemiBold
            text: (referenceMenu.mode === "create" ? qsTr("CREATE OR LINK PAGE") : qsTr("LINK TO PAGE")).toUpperCase()
            Rectangle {
                anchors.fill: parent
                z: -1
                color: "#0dffffff"
                Rectangle {
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.bottom: parent.bottom
                    height: 1
                    color: "#0dffffff"
                }
            }
        }

        Rectangle {
            width: parent.width
            height: 36
            color: "#08ffffff"
            Rectangle {
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.bottom: parent.bottom
                height: 1
                color: "#0dffffff"
            }
            TextField {
                id: searchField
                objectName: "notesRichPageReferenceSearchField"
                anchors.fill: parent
                anchors.margins: 8
                placeholderText: referenceMenu.mode === "create" ? qsTr("New page title or existing page…") : qsTr("Search page titles…")
                text: referenceMenu.searchQuery
                color: "#fffffe"
                placeholderTextColor: "#77798c"
                font.pixelSize: 14
                selectByMouse: true
                Accessible.name: qsTr("Search existing pages")
                background: Item {}
                onTextChanged: {
                    referenceMenu.searchQuery = text
                    referenceMenu.errorMessage = ""
                    referenceMenu.searchErrorMessage = ""
                    referenceMenu.searchQueryEdited(text)
                }
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
        }

        ListView {
            id: pageList
            objectName: "notesRichPageReferenceList"
            width: parent.width
            height: Math.max(0, referenceMenu.height - 68 - referenceMenu.footerHeight)
            clip: true
            model: referenceMenu.options
            currentIndex: referenceMenu.selectedIndex
            boundsBehavior: Flickable.StopAtBounds

            delegate: Button {
                id: pageButton
                required property var modelData
                required property int index
                objectName: "notesRichPageReference_" + String(modelData.id)
                width: pageList.width
                height: 48
                padding: 4
                focusPolicy: Qt.NoFocus
                Accessible.name: String(modelData.title || qsTr("Untitled"))
                background: Rectangle {
                    radius: 6
                    color: pageButton.hovered || referenceMenu.selectedIndex === pageButton.index
                        ? (referenceMenu.selectedIndex === pageButton.index ? "#1affffff" : "#0dffffff")
                        : "transparent"
                }
                contentItem: Row {
                    spacing: 12
                    x: Math.min(12 + Number(pageButton.modelData.depth || 0) * 12, 48)
                    width: Math.max(0, parent.width - x - 8)
                    height: parent.height
                    Rectangle {
                        width: 32
                        height: 32
                        radius: 5
                        anchors.verticalCenter: parent.verticalCenter
                        color: "#0dffffff"
                        border.color: "#0fffffff"
                        Text {
                            anchors.fill: parent
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: 14
                            text: pageButton.modelData.icon || "📄"
                        }
                    }
                    Text {
                        width: Math.max(0, parent.width - 44)
                        anchors.verticalCenter: parent.verticalCenter
                        color: "#fffffe"
                        font.pixelSize: 14
                        font.weight: Font.Medium
                        elide: Text.ElideRight
                        text: pageButton.modelData.title || qsTr("Untitled")
                    }
                }
                onHoveredChanged: if (hovered) referenceMenu.selectedIndex = index
                onClicked: referenceMenu.select(index)
            }

            Text {
                anchors.centerIn: parent
                visible: referenceMenu.options.length === 0
                color: "#a7a9be"
                font.pixelSize: 14
                text: referenceMenu.searchPending
                    ? qsTr("Searching page content…") : qsTr("No matching pages found")
            }
        }

        Text {
            width: Math.max(0, parent.width - 24)
            height: referenceMenu.footerHeight
            visible: referenceMenu.visibleErrorMessage.length > 0
            anchors.horizontalCenter: parent.horizontalCenter
            verticalAlignment: Text.AlignVCenter
            wrapMode: Text.Wrap
            color: "#fda4af"
            font.pixelSize: 10
            text: referenceMenu.visibleErrorMessage
        }
    }
}
