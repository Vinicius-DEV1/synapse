import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: collectionChooser
    Layout.fillWidth: true
    spacing: 4

    property var collections: []
    property var selectedCollectionIds: []
    signal collectionToggled(string collectionId, bool selected)

    Repeater {
        model: collectionChooser.collections
        delegate: CheckBox {
            required property var modelData
            Layout.fillWidth: true
            text: modelData.name
            checked: collectionChooser.selectedCollectionIds.indexOf(modelData.id) >= 0
            onToggled: collectionChooser.collectionToggled(modelData.id, checked)
        }
    }

    Label {
        visible: collectionChooser.collections.length === 0
        text: "No collections yet. Create one in the Collections view."
        color: "#77798c"
        font.pixelSize: 10
        wrapMode: Text.Wrap
    }
}
