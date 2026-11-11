import QtQml 2.15

QtObject {
    id: hierarchyActions
    property var controller: null
    property string parentPageId: ""

    signal structureChanged()
    signal actionFailed(string message)

    function reorder(orderedPageIds) {
        if (!controller || !parentPageId) return
        if (controller.reorderSubPages(parentPageId, orderedPageIds)) structureChanged()
        else actionFailed(qsTr("Could not save the new sub-page order."))
    }

    function move(pageId, newParentId) {
        if (!controller || !pageId) return false
        if (controller.movePage(pageId, newParentId)) {
            structureChanged()
            return true
        }
        actionFailed(qsTr("Could not move the page to that location."))
        return false
    }
}
