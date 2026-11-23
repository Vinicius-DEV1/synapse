import QtQuick 2.15
import QtQuick.Controls 2.15

ToolButton {
    id: actionsMenu

    property var book: ({})
    property var collections: []
    property bool cardHovered: false
    readonly property string readingStatus: book.reading_status || "not_started"
    readonly property bool archived: !!book.is_archived

    signal openRequested(var book)
    signal editRequested(var book)
    signal aiEnrichRequested(var book)
    signal collectionToggleRequested(var book, string collectionId, bool checked)
    signal statusChangeRequested(var book, string status)
    signal archiveToggleRequested(var book, bool archived)
    signal downloadOfflineRequested(var book)
    signal clearCacheRequested(var book)

    visible: cardHovered
    text: "⋮"
    Accessible.name: "Book actions for " + (book.title || "Untitled")
    onClicked: bookActions.open()
    contentItem: Text {
        text: parent.text
        color: parent.hovered ? "white" : "#e4e4e7"
        font.pixelSize: 17
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
    }
    background: Rectangle {
        color: parent.hovered ? "#cc000000" : "#99000000"
        radius: 7
        border.color: "#18ffffff"
    }

    Menu {
        id: bookActions
        MenuItem { text: "Open details"; onTriggered: actionsMenu.openRequested(actionsMenu.book) }
        MenuItem { text: "Edit book details"; onTriggered: actionsMenu.editRequested(actionsMenu.book) }
        MenuItem { text: "✨ Enriquecer com IA"; onTriggered: actionsMenu.aiEnrichRequested(actionsMenu.book) }
        MenuSeparator {}
        MenuItem {
            text: "Mark as not started"
            enabled: actionsMenu.readingStatus !== "not_started" && actionsMenu.readingStatus !== "unread"
            onTriggered: actionsMenu.statusChangeRequested(actionsMenu.book, "not_started")
        }
        MenuItem {
            text: "Mark as reading"
            enabled: actionsMenu.readingStatus !== "reading"
            onTriggered: actionsMenu.statusChangeRequested(actionsMenu.book, "reading")
        }
        MenuItem {
            text: "Mark as finished"
            enabled: actionsMenu.readingStatus !== "finished" && actionsMenu.readingStatus !== "completed"
            onTriggered: actionsMenu.statusChangeRequested(actionsMenu.book, "finished")
        }
        MenuItem {
            text: actionsMenu.archived ? "Restore to library" : "Archive book"
            onTriggered: actionsMenu.archiveToggleRequested(actionsMenu.book, !actionsMenu.archived)
        }
        MenuSeparator { visible: !!actionsMenu.book.drive_file_id }
        MenuItem {
            visible: !!actionsMenu.book.drive_file_id && !actionsMenu.book.is_local
            text: "📥 Baixar para uso offline"
            onTriggered: actionsMenu.downloadOfflineRequested(actionsMenu.book)
        }
        MenuItem {
            visible: !!actionsMenu.book.drive_file_id && !!actionsMenu.book.is_local
            text: "🗑 Liberar espaço (remover cache local)"
            onTriggered: actionsMenu.clearCacheRequested(actionsMenu.book)
        }
        MenuSeparator {}
        Menu {
            id: bookCollectionsMenu
            title: "Collections"
            Instantiator {
                model: actionsMenu.collections
                delegate: MenuItem {
                    required property var modelData
                    text: modelData.name
                    checkable: true
                    checked: {
                        var bookCollections = actionsMenu.book.collections || []
                        if (typeof bookCollections === "string") {
                            try { bookCollections = JSON.parse(bookCollections) }
                            catch (error) {
                                console.warn("[LibraryBookActionsMenu] Invalid collection data for book", actionsMenu.book.id, error)
                                bookCollections = []
                            }
                        }
                        for (var index = 0; index < bookCollections.length; ++index) {
                            if (bookCollections[index].id === modelData.id) return true
                        }
                        return false
                    }
                    onTriggered: actionsMenu.collectionToggleRequested(actionsMenu.book, modelData.id, checked)
                }
                onObjectAdded: function(index, object) { bookCollectionsMenu.insertItem(index, object) }
                onObjectRemoved: function(index, object) { bookCollectionsMenu.removeItem(object) }
            }
            MenuItem {
                visible: actionsMenu.collections.length === 0
                text: "Create a collection first"
                enabled: false
            }
        }
    }
}
