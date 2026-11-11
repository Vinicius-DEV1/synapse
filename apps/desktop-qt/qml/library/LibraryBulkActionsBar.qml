import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: actionsBar
    implicitHeight: 60
    radius: 14
    color: "#eb181720"
    border.color: "#268b5cf6"
    border.width: 1

    property int selectedCount: 0
    property var collections: []
    property bool isViewingArchived: false

    signal statusRequested(string status)
    signal archiveRequested(bool archived)
    signal collectionRequested(string collectionId)
    signal deleteRequested()
    signal clearRequested()

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 16
        anchors.rightMargin: 10
        spacing: 8

        Label {
            text: actionsBar.selectedCount + (actionsBar.selectedCount === 1 ? " book selected" : " books selected")
            color: "#ddd6fe"
            font.pixelSize: 12
            font.weight: Font.DemiBold
        }
        Item { Layout.fillWidth: true }
        Button {
            text: "Status"
            onClicked: statusMenu.open()
            Menu {
                id: statusMenu
                MenuItem { text: "Not started"; onTriggered: actionsBar.statusRequested("not_started") }
                MenuItem { text: "Reading"; onTriggered: actionsBar.statusRequested("reading") }
                MenuItem { text: "Finished"; onTriggered: actionsBar.statusRequested("finished") }
            }
        }
        Button {
            text: actionsBar.isViewingArchived ? "Restore" : "Archive"
            onClicked: actionsBar.archiveRequested(!actionsBar.isViewingArchived)
        }
        Button {
            text: "Add to collection"
            onClicked: collectionMenu.open()
            Menu {
                id: collectionMenu
                Instantiator {
                    model: actionsBar.collections
                    delegate: MenuItem {
                        required property var modelData
                        text: modelData.name
                        onTriggered: actionsBar.collectionRequested(modelData.id)
                    }
                    onObjectAdded: function(index, object) { collectionMenu.insertItem(index, object) }
                    onObjectRemoved: function(index, object) { collectionMenu.removeItem(object) }
                }
                MenuItem { visible: actionsBar.collections.length === 0; text: "Create a collection first"; enabled: false }
            }
        }
        Button { text: "Delete"; onClicked: actionsBar.deleteRequested() }
        ToolButton {
            text: "×"
            Accessible.name: "Clear selected books"
            onClicked: actionsBar.clearRequested()
        }
    }
}
