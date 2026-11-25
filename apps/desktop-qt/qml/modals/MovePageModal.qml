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
    width: Math.min(540, parent ? parent.width - 32 : 540)
    height: Math.min(600, parent ? parent.height - 48 : 600)
    standardButtons: Dialog.NoButton

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
        Qt.callLater(function() { searchField.forceActiveFocus() })
    }

    contentItem: ColumnLayout {
        spacing: 12
        RowLayout {
            Layout.fillWidth: true
            Text { text: qsTr("Mover página para…"); color: theme.textDark; font.pixelSize: 16; font.bold: true; Layout.fillWidth: true }
            ToolButton { text: "×"; onClicked: moveDialog.close(); contentItem: Text { text: "×"; color: theme.textSubtext; font.pixelSize: 18 } }
        }

        TextField {
            id: searchField
            Layout.fillWidth: true
            Layout.preferredHeight: 36
            placeholderText: qsTr("Buscar destino...")
            text: moveDialog.searchText
            onTextChanged: moveDialog.searchText = text
            color: theme.textDark
            background: Rectangle { radius: 8; color: theme.bgDarkBg; border.color: searchField.activeFocus ? theme.brand500 : theme.borderCard }
        }

        ListView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            spacing: 2
            model: moveDialog.destinations()
            delegate: Rectangle {
                required property var modelData
                width: ListView.view.width
                height: modelData.breadcrumb.length > 0 && moveDialog.searchText.length > 0 ? 48 : 36
                radius: 8
                opacity: modelData.invalid ? 0.35 : 1.0
                color: moveDialog.selectedTargetId === modelData.targetId ? theme.activePillBg
                     : (rowMouse.containsMouse && !modelData.invalid ? theme.bgHover : "transparent")
                border.color: moveDialog.selectedTargetId === modelData.targetId ? theme.activePillBorder : "transparent"

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 8 + modelData.depth * 18
                    anchors.rightMargin: 8
                    spacing: 6

                    Rectangle {
                        width: 20; height: 20; radius: 4
                        color: "transparent"
                        visible: moveDialog.searchText.length === 0
                        AppIcon {
                            anchors.centerIn: parent
                            visible: modelData.hasChildren
                            name: moveDialog.expandedIds[modelData.targetId] ? "chevron-down" : "chevron-right"
                            color: theme.textMuted
                            width: 12; height: 12
                        }
                        MouseArea {
                            anchors.fill: parent
                            enabled: modelData.hasChildren
                            cursorShape: Qt.PointingHandCursor
                            onClicked: moveDialog.toggleExpand(modelData.targetId)
                        }
                    }

                    Text { text: modelData.icon; font.pixelSize: 14 }
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 0
                        Text { text: modelData.title; color: theme.textDark; font.pixelSize: 13; elide: Text.ElideRight; Layout.fillWidth: true }
                        Text { visible: modelData.breadcrumb.length > 0 && moveDialog.searchText.length > 0; text: modelData.breadcrumb; color: theme.textMuted; font.pixelSize: 10; elide: Text.ElideRight; Layout.fillWidth: true }
                    }
                    Text { visible: modelData.isCurrent; text: qsTr("Atual"); color: theme.brand300; font.pixelSize: 10 }
                }

            MouseArea {
                    id: rowMouse
                    anchors.fill: parent
                    anchors.leftMargin: moveDialog.searchText.length === 0 && modelData.hasChildren ? 28 + modelData.depth * 18 : 0
                    hoverEnabled: true
                    enabled: !modelData.invalid
                    cursorShape: modelData.invalid ? Qt.ForbiddenCursor : Qt.PointingHandCursor
                    onClicked: {
                        moveDialog.errorMessage = ""
                        moveDialog.selectedTargetId = modelData.targetId
                    }
                    onDoubleClicked: {
                        if (!modelData.invalid && moveDialog.hierarchyActions) {
                            moveDialog.errorMessage = ""
                            moveDialog.selectedTargetId = modelData.targetId
                            confirmMoveBtn.clicked()
                        }
                    }
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

        RowLayout {
            Layout.fillWidth: true
            Item { Layout.fillWidth: true }
            Button {
                id: cancelMoveBtn
                text: qsTr("Cancelar")
                onClicked: moveDialog.close()
                background: Rectangle { color: cancelMoveBtn.hovered ? theme.bgHover : "transparent"; radius: 8 }
                contentItem: Text { text: cancelMoveBtn.text; color: theme.textSubtext; font.pixelSize: 13; leftPadding: 12; rightPadding: 12 }
            }
            Button {
                id: confirmMoveBtn
                text: moveDialog.isSubmitting ? qsTr("Movendo...") : qsTr("Mover Aqui")
                enabled: !moveDialog.isSubmitting && moveDialog.sourcePageId.length > 0 && !moveDialog.isInvalidTarget(moveDialog.selectedTargetId)
                onClicked: {
                    if (!moveDialog.hierarchyActions) return
                    moveDialog.errorMessage = ""
                    moveDialog.isSubmitting = true
                    if (moveDialog.hierarchyActions.move(moveDialog.sourcePageId, moveDialog.selectedTargetId)) {
                        moveDialog.close()
                    } else {
                        moveDialog.errorMessage = qsTr("Não foi possível mover a página para este destino.")
                    }
                    moveDialog.isSubmitting = false
                }
                background: Rectangle { color: confirmMoveBtn.enabled ? theme.brand500 : "#403b50"; radius: 8 }
                contentItem: Text { text: confirmMoveBtn.text; color: "#ffffff"; font.pixelSize: 13; font.weight: Font.Medium; leftPadding: 14; rightPadding: 14 }
            }
        }
    }
}
