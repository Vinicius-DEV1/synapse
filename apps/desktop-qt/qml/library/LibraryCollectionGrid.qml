import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

GridView {
    id: collectionGrid
    clip: true

    property var collections: []
    property var books: []
    property int viewportWidth: width > 0 ? width : 1366
    property var collectionItems: []
    property var booksByCollection: ({})
    readonly property int columnCount: viewportWidth >= 1280 ? 6
                                   : viewportWidth >= 1024 ? 5
                                   : viewportWidth >= 768 ? 4
                                   : viewportWidth >= 640 ? 3 : 2
    readonly property int gridGap: viewportWidth >= 640 ? 24 : 12

    signal collectionSelected(var collection)
    signal createRequested()
    signal editRequested(var collection)
    signal deleteRequested(var collection)

    function refreshItems() {
        var nextItems = [{ isCreateCard: true, collection: ({}) }]
        for (var index = 0; index < collections.length; ++index) {
            nextItems.push({ isCreateCard: false, collection: collections[index] })
        }
        collectionItems = nextItems
        var nextBooksByCollection = ({})
        for (var index = 0; index < books.length; ++index) {
            var book = books[index]
            var bookCollections = book.collections || []
            if (typeof bookCollections === "string") {
                try {
                    bookCollections = JSON.parse(bookCollections)
                } catch (error) {
                    console.warn("[LibraryCollectionGrid] Could not parse collection data for book", book.id, error)
                    bookCollections = []
                }
            }
            for (var collectionIndex = 0; collectionIndex < bookCollections.length; ++collectionIndex) {
                var collectionId = bookCollections[collectionIndex].id
                if (!collectionId) continue
                if (!nextBooksByCollection[collectionId]) nextBooksByCollection[collectionId] = []
                nextBooksByCollection[collectionId].push(book)
            }
        }
        booksByCollection = nextBooksByCollection
    }

    onCollectionsChanged: refreshItems()
    onBooksChanged: refreshItems()
    Component.onCompleted: refreshItems()

    cellWidth: width / columnCount
    cellHeight: Math.round(Math.max(1, cellWidth - gridGap) * 1.333333) + 132
    model: collectionItems

    delegate: Rectangle {
        id: collectionCard
        required property var modelData
        readonly property bool isCreateCard: modelData.isCreateCard
        readonly property var collection: modelData.collection
        readonly property int cardWidth: Math.max(1, collectionGrid.cellWidth - collectionGrid.gridGap)
        readonly property int coverHeight: Math.round(cardWidth * 1.333333)
        readonly property var collectionBooks: isCreateCard ? [] : (collectionGrid.booksByCollection[collection.id] || [])
        readonly property var previewBooks: collectionBooks.slice(0, 3)

        width: cardWidth
        height: collectionGrid.cellHeight - 16
        radius: 12
        color: collectionMouse.containsMouse ? "#211f30" : "#191821"
        border.color: isCreateCard ? "#337c3aed" : collectionMouse.containsMouse ? "#668b5cf6" : "#0dffffff"
        border.width: isCreateCard ? 2 : 1
        clip: true

        Behavior on color { ColorAnimation { duration: 150 } }
        Behavior on border.color { ColorAnimation { duration: 150 } }

        ColumnLayout {
            anchors.fill: parent
            spacing: 0

            Item {
                Layout.fillWidth: true
                Layout.preferredHeight: collectionCard.coverHeight
                clip: true

                Rectangle {
                    anchors.fill: parent
                    color: collectionCard.isCreateCard ? "#15141b" : Qt.darker(collectionCard.collection.color || "#6366f1", 2.5)
                    opacity: collectionCard.isCreateCard ? 1 : 0.7
                    Rectangle {
                        anchors.fill: parent
                        color: collectionCard.isCreateCard ? "transparent" : collectionCard.collection.color || "#6366f1"
                        opacity: 0.14
                    }
                }

                Rectangle {
                    visible: collectionCard.previewBooks.length > 2
                    anchors.top: parent.top
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.margins: 18
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: 25
                    radius: 7
                    color: "#15141b"
                    border.color: "#30ffffff"
                    rotation: -6
                    Image { id: rearCoverImage; anchors.fill: parent; anchors.margins: 2; source: collectionCard.previewBooks.length > 2 ? collectionCard.previewBooks[2].cover_image || "" : ""; asynchronous: true; fillMode: Image.PreserveAspectCrop; visible: status === Image.Ready }
                    Text { anchors.centerIn: parent; width: parent.width - 12; visible: collectionCard.previewBooks.length > 2 && (!collectionCard.previewBooks[2].cover_image || rearCoverImage.status === Image.Error); text: collectionCard.previewBooks.length > 2 ? collectionCard.previewBooks[2].title || "Book" : ""; color: "#d4d4dc"; font.pixelSize: 8; horizontalAlignment: Text.AlignHCenter; wrapMode: Text.Wrap; maximumLineCount: 3; elide: Text.ElideRight }
                }
                Rectangle {
                    visible: collectionCard.previewBooks.length > 1
                    anchors.top: parent.top
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.margins: 16
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: 18
                    radius: 7
                    color: "#15141b"
                    border.color: "#30ffffff"
                    rotation: 6
                    Image { id: middleCoverImage; anchors.fill: parent; anchors.margins: 2; source: collectionCard.previewBooks.length > 1 ? collectionCard.previewBooks[1].cover_image || "" : ""; asynchronous: true; fillMode: Image.PreserveAspectCrop; visible: status === Image.Ready }
                    Text { anchors.centerIn: parent; width: parent.width - 12; visible: collectionCard.previewBooks.length > 1 && (!collectionCard.previewBooks[1].cover_image || middleCoverImage.status === Image.Error); text: collectionCard.previewBooks.length > 1 ? collectionCard.previewBooks[1].title || "Book" : ""; color: "#d4d4dc"; font.pixelSize: 8; horizontalAlignment: Text.AlignHCenter; wrapMode: Text.Wrap; maximumLineCount: 3; elide: Text.ElideRight }
                }
                Rectangle {
                    visible: collectionCard.previewBooks.length > 0
                    anchors.top: parent.top
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.bottom: parent.bottom
                    anchors.margins: collectionCard.previewBooks.length > 1 ? 19 : 16
                    anchors.bottomMargin: 15
                    radius: 8
                    color: "#191821"
                    border.color: "#40ffffff"
                    Image { id: frontCoverImage; anchors.fill: parent; anchors.margins: 2; source: collectionCard.previewBooks.length > 0 ? collectionCard.previewBooks[0].cover_image || "" : ""; asynchronous: true; fillMode: Image.PreserveAspectCrop; visible: status === Image.Ready }
                    Text { anchors.centerIn: parent; width: parent.width - 12; visible: collectionCard.previewBooks.length > 0 && (!collectionCard.previewBooks[0].cover_image || frontCoverImage.status === Image.Error); text: collectionCard.previewBooks.length > 0 ? collectionCard.previewBooks[0].title || "Book" : ""; color: "#d4d4dc"; font.pixelSize: 9; horizontalAlignment: Text.AlignHCenter; wrapMode: Text.Wrap; maximumLineCount: 4; elide: Text.ElideRight }
                }
                ColumnLayout {
                    anchors.centerIn: parent
                    visible: collectionCard.previewBooks.length === 0
                    spacing: 8
                    AppIcon {
                        Layout.alignment: Qt.AlignHCenter
                        width: 34
                        height: 34
                        name: collectionCard.isCreateCard ? "plus" : "folder"
                        color: collectionCard.isCreateCard ? "#a7a9be" : (collectionCard.collection.color || "#a78bfa")
                    }
                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: collectionCard.isCreateCard ? "Nova coleção" : "Coleção vazia"
                        color: "#a7a9be"
                        font.pixelSize: 11
                    }
                }

                Rectangle {
                    anchors.top: parent.top
                    anchors.left: parent.left
                    anchors.margins: 10
                    width: 10
                    height: 10
                    radius: 5
                    color: collectionCard.collection.color || "#6366f1"
                    visible: !collectionCard.isCreateCard
                }

                Rectangle {
                    visible: !collectionCard.isCreateCard
                    anchors.top: parent.top
                    anchors.right: parent.right
                    anchors.margins: 8
                    width: countLabel.implicitWidth + 18
                    height: 23
                    radius: 6
                    color: "#99000000"
                    border.color: "#18ffffff"
                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 4
                        AppIcon { width: 11; height: 11; name: "library"; color: collectionCard.collection.color || "#a78bfa" }
                        Text { id: countLabel; text: collectionCard.collectionBooks.length + (collectionCard.collectionBooks.length === 1 ? " livro" : " livros"); color: "#f4f4f5"; font.pixelSize: 9; font.bold: true }
                    }
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.margins: 12
                spacing: 5
                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        Layout.fillWidth: true
                        text: collectionCard.isCreateCard ? "Nova coleção" : collectionCard.collection.name
                        color: collectionCard.isCreateCard ? "#a7a9be" : collectionMouse.containsMouse ? "#c4b5fd" : "#f4f4f5"
                        font.pixelSize: 13
                        font.weight: Font.Medium
                        elide: Text.ElideRight
                    }
                    ToolButton {
                        visible: !collectionCard.isCreateCard && collectionMouse.containsMouse
                        text: "⋮"
                        Accessible.name: "Ações da coleção " + collectionCard.collection.name
                        onClicked: collectionMenu.open()
                        contentItem: Text { text: parent.text; color: parent.hovered ? "white" : "#a7a9be"; font.pixelSize: 16; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                        background: Rectangle { color: parent.hovered ? "#20ffffff" : "transparent"; radius: 6 }
                        Menu {
                            id: collectionMenu
                            MenuItem { text: "Editar coleção"; onTriggered: collectionGrid.editRequested(collectionCard.collection) }
                            MenuItem { text: "Excluir coleção"; onTriggered: collectionGrid.deleteRequested(collectionCard.collection) }
                        }
                    }
                }
                Text {
                    visible: !collectionCard.isCreateCard
                    Layout.fillWidth: true
                    text: collectionCard.collectionBooks.length > 0
                          ? collectionCard.collectionBooks.slice(0, 2).map(function(book) { return book.title }).join(", ") +
                            (collectionCard.collectionBooks.length > 2 ? " e +" + (collectionCard.collectionBooks.length - 2) : "")
                          : "Nenhum livro agrupado"
                    color: "#9293a5"
                    font.pixelSize: 10
                    elide: Text.ElideRight
                }
                Item { Layout.fillHeight: true }
            }
        }

        MouseArea {
            id: collectionMouse
            anchors.fill: parent
            z: -1
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: {
                if (collectionCard.isCreateCard) collectionGrid.createRequested()
                else collectionGrid.collectionSelected(collectionCard.collection)
            }
        }
    }
}
