import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: actionBar
    objectName: "notesLinkPreviewActionMenu"
    property var actions: []
    readonly property var menuItems: actions.map(function(action) {
        var link = action.url
        return ({ label: action.label, activate: function() { actionBar.actionActivated(link) } })
    })
    signal actionActivated(string link)
    visible: actions.length > 0
    Layout.fillWidth: true
    implicitHeight: visible ? actionButton.implicitHeight : 0
    spacing: 8

    ToolButton {
        id: actionButton
        objectName: "notesLinkPreviewActionButton"
        text: qsTr("Link actions")
        Accessible.name: text
        Accessible.description: qsTr("Open keyboard-accessible actions for saved link previews. Use arrow keys to move and Enter or Space to activate.")
        onClicked: actionPopup.open()

        Menu {
            id: actionPopup
            objectName: "notesLinkPreviewActionPopup"
            Repeater {
                model: actionBar.menuItems
                MenuItem {
                    required property var modelData
                    text: modelData.label
                    Accessible.name: modelData.label
                    onTriggered: modelData.activate()
                }
            }
        }
    }
}
