pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: bodyRoot
    property var items: []
    property var uniqueExtensions: []
    property string title: qsTr("Documentos")
    property string accentColor: "default"
    property bool itemsInvalid: false
    property bool renaming: false
    property bool expanded: false
    property bool showColorPicker: false
    property bool pointerHovered: false

    signal titleClicked()
    signal renameRequested()
    signal titleSaveRequested(string nextTitle)
    signal renameCanceled()
    signal colorPickerToggled()
    signal colorSelected(string nextColor)
    signal colorPickerDismissed()
    signal managerRequested()
    signal expandedToggled()
    signal addRequested()
    signal deleteRequested()
    signal removeItemRequested(string fileId, string itemName)
    signal filePreviewRequested(string fileId, string fileName, bool showOpenActions, bool playAudio, bool openFolder)

    anchors.fill: parent
    anchors.leftMargin: 12
    anchors.rightMargin: 10
    anchors.topMargin: 6
    anchors.bottomMargin: 6
    spacing: 8
    implicitHeight: contentColumn.implicitHeight + 12

    HoverHandler { id: contentHover }

    ColumnLayout {
        id: contentColumn
        Layout.fillWidth: true
        spacing: 8

        DocumentBundleWidgetHeader {
            items: bodyRoot.items
            uniqueExtensions: bodyRoot.uniqueExtensions
            title: bodyRoot.title
            renaming: bodyRoot.renaming
            itemsInvalid: bodyRoot.itemsInvalid
            onTitleClicked: bodyRoot.titleClicked()
            onRenameRequested: bodyRoot.renameRequested()
            onTitleSaveRequested: function(nextTitle) { bodyRoot.titleSaveRequested(nextTitle) }
            onRenameCanceled: bodyRoot.renameCanceled()
        }

        NotesWidgetColorPalette {
            anchorItem: widgetActions.colorAnchorItem
            isOpen: bodyRoot.showColorPicker && !bodyRoot.itemsInvalid
            currentColor: bodyRoot.accentColor
            onColorSelected: function(nextColor) { bodyRoot.colorSelected(nextColor) }
            onDismissed: bodyRoot.colorPickerDismissed()
        }

        DocumentBundleWidgetActions {
            id: widgetActions
            pointerHovered: bodyRoot.pointerHovered || contentHover.hovered
            colorPickerOpen: bodyRoot.showColorPicker
            expanded: bodyRoot.expanded
            renaming: bodyRoot.renaming
            itemsInvalid: bodyRoot.itemsInvalid
            onManageRequested: bodyRoot.managerRequested()
            onExpandToggled: bodyRoot.expandedToggled()
            onRenameRequested: bodyRoot.renameRequested()
            onColorPickerToggled: bodyRoot.colorPickerToggled()
            onAddRequested: bodyRoot.addRequested()
            onDeleteRequested: bodyRoot.deleteRequested()
        }

        DocumentBundleItemsPreview {
            items: bodyRoot.items
            expanded: bodyRoot.expanded
            itemsInvalid: bodyRoot.itemsInvalid
            onPreviewRequested: function(fileId, fileName) {
                bodyRoot.filePreviewRequested(fileId, fileName, false, false, false)
            }
            onRemoveRequested: function(fileId, itemName) {
                bodyRoot.removeItemRequested(fileId, itemName)
            }
        }
    }
}
