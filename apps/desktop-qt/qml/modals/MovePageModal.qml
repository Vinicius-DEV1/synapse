import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

// Collapsible hierarchical Move Page modal mirroring apps/web-react/src/components/modals/MovePageModal.tsx
Dialog {
    id: moveDialog
    objectName: "movePageModal"

    property string sourcePageId: ""
    property var pages: []
    property var hierarchyActions: null
    property var pageIndex: ({})
    property var expandedIds: ({})
    property string searchText: ""
    property string selectedTargetId: ""
    property string errorMessage: ""
    property bool isSubmitting: false

    title: qsTr("Mover página")
    modal: true
    focus: true
    anchors.centerIn: parent
    width: Math.min(512, parent ? parent.width - 32 : 512)
    height: Math.min(parent ? parent.height * 0.82 : 600, parent ? parent.height - 48 : 600)
    standardButtons: Dialog.NoButton
    padding: 0

    Theme { id: theme }

    background: Rectangle {
        color: theme.bgDarkCard
        border.color: theme.borderCard
        radius: 16
    }

    function normalizedId(value) {
        if (value === null || value === undefined || value === "" || value === "null") return ""
        return String(value)
    }

    function rebuildPageIndex() {
        var nextIndex = ({})
        for (var i = 0; i < pages.length; ++i) {
            if (pages[i] && pages[i].id) nextIndex[String(pages[i].id)] = pages[i]
        }
        pageIndex = nextIndex
    }

    function isInvalidTarget(targetId) {
        var cur = normalizedId(targetId)
        var visited = ({})
        while (cur.length > 0 && !visited[cur]) {
            if (cur === sourcePageId) return true
            visited[cur] = true
            var p = pageIndex[cur]
            cur = p ? normalizedId(p.parent_id) : ""
        }
        return false
    }

    function isCurrentParentTarget(targetId) {
        var source = pageIndex[sourcePageId]
        return normalizedId(targetId) === normalizedId(source ? source.parent_id : "")
    }

    function breadcrumbFor(pageId) {
        var path = []
        var cur = normalizedId(pageId)
        var visited = ({})
        while (cur.length > 0 && !visited[cur]) {
            visited[cur] = true
            var p = pageIndex[cur]
            if (!p) break
            path.unshift(p.title || qsTr("Sem título"))
            cur = normalizedId(p.parent_id)
        }
        return path.length > 0 ? path.join(" > ") : qsTr("Raiz (Início)")
    }

    function sourceTitle() {
        var source = pageIndex[sourcePageId]
        return source && source.title ? source.title : qsTr("Sem Título")
    }

    function submitMove() {
        if (!hierarchyActions || sourcePageId.length === 0 || isInvalidTarget(selectedTargetId)
                || isCurrentParentTarget(selectedTargetId) || isSubmitting) return
        errorMessage = ""
        isSubmitting = true
        if (hierarchyActions.move(sourcePageId, selectedTargetId)) {
            close()
        } else {
            errorMessage = qsTr("Não foi possível mover a página para este destino.")
        }
        isSubmitting = false
    }

    function toggleExpand(id) {
        var copy = Object.assign({}, expandedIds)
        if (copy[id]) delete copy[id]
        else copy[id] = true
        expandedIds = copy
    }

    function isNodeVisibleInTree(p) {
        var pid = normalizedId(p.parent_id)
        var visited = ({})
        while (pid.length > 0 && !visited[pid]) {
            if (!expandedIds[pid]) return false
            visited[pid] = true
            var parentPage = pageIndex[pid]
            pid = parentPage ? normalizedId(parentPage.parent_id) : ""
        }
        return true
    }

    function destinations() {
        var result = []
        var q = searchText.trim().toLowerCase()
        var src = pageIndex[sourcePageId]
        var curParent = src ? normalizedId(src.parent_id) : ""
        var rootTitle = qsTr("Raiz (Início)")

        if (q.length === 0 || rootTitle.toLowerCase().indexOf(q) >= 0) {
            result.push({
                targetId: "", title: rootTitle, breadcrumb: rootTitle,
                icon: "⌂", depth: 0, hasChildren: false, invalid: false,
                isCurrent: curParent.length === 0
            })
        }

        if (q.length === 0) {
            // Hierarchical tree mode: respect expandedIds
            for (var i = 0; i < pages.length; ++i) {
                var node = pages[i]
                if (!node || !node.id || !isNodeVisibleInTree(node)) continue
                var invalid = isInvalidTarget(node.id)
                result.push({
                    targetId: String(node.id),
                    title: node.title || qsTr("Sem título"),
                    breadcrumb: "",
                    icon: node.icon || "📄",
                    depth: Number(node.depth || 0),
                    hasChildren: Boolean(node.has_children),
                    invalid: invalid,
                    isCurrent: curParent === String(node.id)
                })
            }
        } else {
            // Flat search mode with breadcrumb trail
            for (var j = 0; j < pages.length; ++j) {
                var p = pages[j]
                if (!p || !p.id) continue
                var titleText = p.title || qsTr("Sem título")
                var bc = breadcrumbFor(p.id)
                if (titleText.toLowerCase().indexOf(q) < 0 && bc.toLowerCase().indexOf(q) < 0) continue
                result.push({
                    targetId: String(p.id),
                    title: titleText,
                    breadcrumb: bc,
                    icon: p.icon || "📄",
                    depth: 0,
                    hasChildren: false,
                    invalid: isInvalidTarget(p.id),
                    isCurrent: curParent === String(p.id)
                })
            }
        }
        return result
    }

    function openForPage(pageId) {
        sourcePageId = normalizedId(pageId)
        rebuildPageIndex()
        searchText = ""
        errorMessage = ""
        isSubmitting = false
        var src = pageIndex[sourcePageId]
        selectedTargetId = src ? normalizedId(src.parent_id) : ""
        // Auto-expand ancestor chain
        var exp = ({})
        var pid = selectedTargetId
        var guard = 0
        while (pid.length > 0 && guard++ < 32) {
            exp[pid] = true
            var pp = pageIndex[pid]
            pid = pp ? normalizedId(pp.parent_id) : ""
        }
        expandedIds = exp
        open()
        Qt.callLater(function() { movePageSearchBar.focusInput() })
    }

    contentItem: ColumnLayout {
        spacing: 0
        MovePageModalHeader {
            Layout.fillWidth: true
            sourceTitle: moveDialog.sourceTitle()
            currentLocation: moveDialog.breadcrumbFor(moveDialog.pageIndex[moveDialog.sourcePageId]
                                                       ? moveDialog.pageIndex[moveDialog.sourcePageId].parent_id : "")
            onDismiss: moveDialog.close()
        }

        MovePageSearchBar {
            id: movePageSearchBar
            Layout.fillWidth: true
            query: moveDialog.searchText
            onQueryEdited: (value) => { moveDialog.searchText = value }
            onSubmitRequested: moveDialog.submitMove()
        }

        ListView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            spacing: 2
            model: moveDialog.destinations()
            delegate: MovePageDestinationRow {
                required property var modelData
                target: modelData
                width: ListView.view.width
                height: modelData.breadcrumb.length > 0 && moveDialog.searchText.length > 0 ? 54 : (modelData.targetId === "" ? 52 : 40)
                searchText: moveDialog.searchText
                selectedTargetId: moveDialog.selectedTargetId
                sourcePageId: moveDialog.sourcePageId
                expandedIds: moveDialog.expandedIds
                onDestinationSelected: (targetId) => {
                    moveDialog.errorMessage = ""
                    moveDialog.selectedTargetId = targetId
                }
                onExpandRequested: (targetId) => moveDialog.toggleExpand(targetId)
                onDestinationActivated: (targetId) => {
                    moveDialog.selectedTargetId = targetId
                    moveDialog.submitMove()
                }
            }
        }

        Text {
            Layout.fillWidth: true
            visible: moveDialog.errorMessage.length > 0
            text: moveDialog.errorMessage
            color: "#fda4af"
            font.pixelSize: 12
            wrapMode: Text.Wrap
        }

        MovePageModalFooter {
            Layout.fillWidth: true
            selectedLocation: moveDialog.breadcrumbFor(moveDialog.selectedTargetId)
            submitting: moveDialog.isSubmitting
            sameLocation: moveDialog.isCurrentParentTarget(moveDialog.selectedTargetId)
            validTarget: moveDialog.sourcePageId.length > 0 && !moveDialog.isInvalidTarget(moveDialog.selectedTargetId)
            onCancel: moveDialog.close()
            onMove: moveDialog.submitMove()
        }
    }
}
