import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: helpRoot
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 720)
    height: Math.min(parent.height - 32, 450)
    modal: true
    title: qsTr("Notes guide")
    visible: isOpen
    property bool isOpen: false
    property int section: 0

    contentItem: RowLayout {
        spacing: 20
        ColumnLayout {
            Layout.preferredWidth: 170
            Layout.fillHeight: true
            Button { Layout.fillWidth: true; text: qsTr("Editing"); highlighted: helpRoot.section === 0; onClicked: helpRoot.section = 0 }
            Button { Layout.fillWidth: true; text: qsTr("Pages"); highlighted: helpRoot.section === 1; onClicked: helpRoot.section = 1 }
            Button { Layout.fillWidth: true; text: qsTr("Shortcuts"); highlighted: helpRoot.section === 2; onClicked: helpRoot.section = 2 }
            Item { Layout.fillHeight: true }
            Button { Layout.fillWidth: true; text: qsTr("Close"); onClicked: helpRoot.close() }
        }
        Text {
            Layout.fillWidth: true
            Layout.fillHeight: true
            color: "#fffffe"
            wrapMode: Text.Wrap
            lineHeight: 1.4
            text: helpRoot.section === 0
                ? qsTr("Edit text directly in the page. Use the formatting toolbar for text marks and the block handle for block actions, colors, moving, duplicating, or deleting. Type / in a text block to search the block menu. Use /evento to create an agenda event linked to the current page. Open the event widget to review reminders, change its note color, edit its title or date, mark it complete, open Agenda, or remove it; removal asks for confirmation, expired events stay in the agenda, and deleting an active recurring event removes its full series. Hover over the widget to move it one block up or down; an amber pulse marks an event from 15 minutes before it starts until one hour afterward. Drag a block handle to move a block or place it beside another block to create columns. Use the contextual table controls to configure columns, filter rows, reorder rows or columns, and edit cells. A table filter is a read-only view: clear the filter before editing the table; hidden rows remain in the page. Insert an image from the image controls or paste/drop supported local images. Use the media picker or drop a local non-image file to import an encrypted attachment; the vault must be unlocked. The editor saves changes automatically. If saving fails, use Save to retry.")
                : helpRoot.section === 1
                ? qsTr("Use the page tree and page actions to create, rename, move, pin, duplicate, or delete pages. Create a linked page from the slash menu or add a reference to an existing page. Activate a page reference to open its preview; use Expand to navigate to the full page. Open History from the page actions to inspect or restore a saved revision. Encrypted pages must be unlocked before their content can be edited.")
                : qsTr("Ctrl/Cmd+S: save\nCtrl/Cmd+B: bold\nCtrl/Cmd+I: italic\nCtrl/Cmd+U: underline\nCtrl/Cmd+Shift+X: strikeout\nCtrl/Cmd+Shift+S: spoiler\n/: open the block menu\nUp/Down: move through menu results\nEnter: apply the selected result\nEscape: close the menu\nLeft/Right: close the menu and move the caret\nSpace: close the menu and insert a space\n\nEditor shortcuts are disabled while an editor dialog is open.")
        }
    }
}
