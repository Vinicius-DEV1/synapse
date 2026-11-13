import QtQuick 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: filterBar
    Layout.fillWidth: true
    spacing: 8

    property string activeStatusFilter: "all"
    property string activeFormatFilter: "all"
    property var authors: []
    property string selectedAuthor: ""
    property string sortBy: "last_read"
    property string sortOrder: "desc"

    signal filterSelected(string filter)
    signal formatSelected(string format)
    signal authorSelected(string author)
    signal sortChanged(string key, string order)

    // Status filter tabs
    Repeater {
        model: [
            { key: "all", label: qsTr("Todos") },
            { key: "reading", label: qsTr("Lendo") },
            { key: "finished", label: qsTr("Concluídos") },
            { key: "queue", label: qsTr("Na fila") }
        ]
        delegate: Rectangle {
            id: statusTab
            required property var modelData
            readonly property bool isSelected: filterBar.activeStatusFilter === modelData.key
            objectName: "libraryStatusTab_" + modelData.key
            height: 30
            width: tabLabel.implicitWidth + 24
            radius: 15
            color: isSelected ? "#7c3aed" : "#161524"
            border.color: isSelected ? "#a78bfa" : "#10ffffff"
            border.width: 1

            Text {
                id: tabLabel
                anchors.centerIn: parent
                text: statusTab.modelData.label
                color: statusTab.isSelected ? "#ffffff" : "#a7a9be"
                font.pixelSize: 12
                font.bold: statusTab.isSelected
            }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: filterBar.filterSelected(statusTab.modelData.key)
            }
        }
    }

    Rectangle {
        Layout.preferredWidth: 1
        Layout.preferredHeight: 18
        color: "#18ffffff"
        Layout.leftMargin: 4
        Layout.rightMargin: 4
    }

    // Format filter tabs
    Repeater {
        model: [
            { key: "all", label: qsTr("Todos formatos") },
            { key: "pdf", label: "PDF" },
            { key: "epub", label: "EPUB" }
        ]
        delegate: Rectangle {
            id: formatTab
            required property var modelData
            readonly property bool isSelected: filterBar.activeFormatFilter === modelData.key
            objectName: "libraryFormatTab_" + modelData.key
            height: 30
            width: formatLabel.implicitWidth + 20
            radius: 15
            color: isSelected ? "#267c3aed" : "#161524"
            border.color: isSelected ? "#a78bfa" : "#10ffffff"
            border.width: 1

            Text {
                id: formatLabel
                anchors.centerIn: parent
                text: formatTab.modelData.label
                color: formatTab.isSelected ? "#c4b5fd" : "#a7a9be"
                font.pixelSize: 12
                font.bold: formatTab.isSelected
            }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: filterBar.formatSelected(formatTab.modelData.key)
            }
        }
    }

    Item { Layout.fillWidth: true }

    LibraryAuthorDropdown {
        authors: filterBar.authors
        selectedAuthor: filterBar.selectedAuthor
        onAuthorSelected: function(author) { filterBar.authorSelected(author) }
    }

    LibrarySortDropdown {
        sortBy: filterBar.sortBy
        sortOrder: filterBar.sortOrder
        onSortChanged: function(key, order) { filterBar.sortChanged(key, order) }
    }
}
