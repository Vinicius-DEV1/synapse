import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: modeBar
    Layout.fillWidth: true
    spacing: 8

    property string viewMode: "books"
    property int collectionCount: 0
    property int archivedCount: 0
    property bool hasSelectedCollection: false
    property bool isViewingArchived: false
    property string selectedCollectionName: ""

    signal booksRequested()
    signal collectionsRequested()
    signal backToCollectionsRequested()
    signal helpRequested()
    signal archiveViewRequested(bool archived)

    Button {
        text: "Books"
        onClicked: modeBar.booksRequested()
        background: Rectangle { radius: 8; color: modeBar.viewMode === "books" ? "#292635" : "#161524"; border.color: modeBar.viewMode === "books" ? "#408b5cf6" : "#10ffffff" }
        contentItem: Text { text: parent.text; color: modeBar.viewMode === "books" ? "#ddd6fe" : "#a7a9be"; font.pixelSize: 11; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter; leftPadding: 10; rightPadding: 10 }
    }
    Button {
        text: "Collections (" + modeBar.collectionCount + ")"
        onClicked: modeBar.collectionsRequested()
        background: Rectangle { radius: 8; color: modeBar.viewMode === "collections" ? "#292635" : "#161524"; border.color: modeBar.viewMode === "collections" ? "#408b5cf6" : "#10ffffff" }
        contentItem: Text { text: parent.text; color: modeBar.viewMode === "collections" ? "#ddd6fe" : "#a7a9be"; font.pixelSize: 11; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter; leftPadding: 10; rightPadding: 10 }
    }
    Item { Layout.fillWidth: true }
    Label { visible: modeBar.hasSelectedCollection; text: "Collection: " + modeBar.selectedCollectionName; color: "#c4b5fd"; font.pixelSize: 11 }
    Button {
        visible: modeBar.hasSelectedCollection
        text: "← All collections"
        onClicked: modeBar.backToCollectionsRequested()
    }
    Button {
        text: modeBar.isViewingArchived ? "← Active library" : "Archive (" + modeBar.archivedCount + ")"
        onClicked: modeBar.archiveViewRequested(!modeBar.isViewingArchived)
    }
    Button { text: "Guide"; onClicked: modeBar.helpRequested() }
}
