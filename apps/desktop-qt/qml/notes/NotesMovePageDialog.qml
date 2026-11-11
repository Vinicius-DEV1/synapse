import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: moveDialog

    property string sourcePageId: ""
    property var pages: []
    property var hierarchyActions: null
    property var pageIndex: ({})
    property string searchText: ""
    property string selectedTargetId: ""
    property string errorMessage: ""

    title: qsTr("Move page")
    modal: true
    focus: true
    anchors.centerIn: parent
    width: Math.min(560, parent ? parent.width - 32 : 560)
    height: Math.min(620, parent ? parent.height - 48 : 620)
    standardButtons: Dialog.NoButton

    background: Rectangle {
        color: "#1a1924"
        border.color: "#2affffff"
        radius: 14
    }

    function normalizedId(value) {
        if (value === null || value === undefined || value === "" || value === "null") return ""
        return String(value)
    }
    function rebuildPageIndex() {
        var nextIndex = ({})
        for (var index = 0; index < pages.length; ++index) {
            var page = pages[index]
            if (page && page.id) nextIndex[String(page.id)] = page
        }
        pageIndex = nextIndex
    }

    function sourcePage() {
        return pageIndex[sourcePageId] || null
    }
    function currentParentId() {
        var page = sourcePage()
        return page ? normalizedId(page.parent_id) : ""
    }

    function isInvalidTarget(targetId) {
        var currentId = normalizedId(targetId)
        var visited = ({})
        while (currentId.length > 0 && !visited[currentId]) {
            if (currentId === sourcePageId) return true
            visited[currentId] = true
            var current = pageIndex[currentId]
            currentId = current ? normalizedId(current.parent_id) : ""
        }
        return false
    }
    function breadcrumbFor(pageId) {
        var path = []
        var currentId = normalizedId(pageId)
        var visited = ({})
        while (currentId.length > 0 && !visited[currentId]) {
            visited[currentId] = true
            var current = pageIndex[currentId]
            if (!current) break
            path.unshift(current.title || qsTr("Untitled"))
            currentId = normalizedId(current.parent_id)
        }
        return path.join("  ›  ")
    }

    function destinations() {
        var result = []
        var query = searchText.trim().toLowerCase()
        var rootTitle = qsTr("Top level")
        if (query.length === 0 || rootTitle.toLowerCase().indexOf(query) >= 0 || "root main raiz inicio".indexOf(query) >= 0) {
            result.push({
                targetId: "",
                title: rootTitle,
                breadcrumb: rootTitle,
                icon: "⌂",
                depth: 0,
                isCurrent: currentParentId().length === 0
            })
        }

        for (var index = 0; index < pages.length; ++index) {
            var page = pages[index]
            if (!page || !page.id || String(page.id) === sourcePageId || isInvalidTarget(page.id)) continue
            var titleText = page.title || qsTr("Untitled")
            var breadcrumb = breadcrumbFor(page.id)
            if (query.length > 0 && titleText.toLowerCase().indexOf(query) < 0 && breadcrumb.toLowerCase().indexOf(query) < 0) continue
            result.push({
                targetId: String(page.id),
                title: titleText,
                breadcrumb: breadcrumb,
                icon: page.icon || (page.has_children ? "📁" : "📄"),
                depth: Number(page.depth) || 0,
                isCurrent: String(page.id) === currentParentId()
            })
        }
        return result
    }
    function openForPage(pageId) {
        sourcePageId = String(pageId || "")
        rebuildPageIndex()
        if (!sourcePage()) return
        open()
    }

    function submitMove() {
        if (!sourcePage() || selectedTargetId === currentParentId()) return
        if (isInvalidTarget(selectedTargetId)) {
            errorMessage = qsTr("A page cannot be moved into itself or one of its sub-pages.")
            return
        }
        if (!hierarchyActions || !hierarchyActions.move(sourcePageId, selectedTargetId)) {
            errorMessage = qsTr("The page could not be moved. Refresh the page tree and try again.")
            return
        }
        close()
    }


    onPagesChanged: rebuildPageIndex()
    onOpened: {
        searchText = ""
        errorMessage = ""
        selectedTargetId = currentParentId()
        Qt.callLater(function() { searchField.forceActiveFocus() })
    }
    onRejected: errorMessage = ""

    header: Rectangle {
        implicitHeight: 72
        color: "#04ffffff"
        radius: 14
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 18
            anchors.rightMargin: 12
            spacing: 12
            Rectangle {
                Layout.preferredWidth: 34
                Layout.preferredHeight: 34
                radius: 10
                color: "#1f8b5cf6"
                Text { anchors.centerIn: parent; text: "↗"; color: "#c4b5fd"; font.pixelSize: 19 }
            }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3
                Text {
                    Layout.fillWidth: true
                    text: qsTr("Move ‘%1’").arg(moveDialog.sourcePage() ? moveDialog.sourcePage().title || qsTr("Untitled") : "")
                    color: "#fffffe"
                    font.pixelSize: 14
                    font.bold: true
                    elide: Text.ElideRight
                }
                Text {
                    Layout.fillWidth: true
                    text: qsTr("Current location: %1").arg(moveDialog.breadcrumbFor(moveDialog.currentParentId()) || qsTr("Top level"))
                    color: "#a7a9be"
                    font.pixelSize: 10
                    elide: Text.ElideRight
                }
            }
            ToolButton {
                text: "×"
                Accessible.name: qsTr("Close")
                onClicked: moveDialog.reject()
                contentItem: Text { text: parent.text; color: "#a7a9be"; font.pixelSize: 22; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
    }

    contentItem: ColumnLayout {
        spacing: 10

        TextField {
            id: searchField
            Layout.fillWidth: true
            placeholderText: qsTr("Search destinations by page name or path…")
            text: moveDialog.searchText
            onTextChanged: {
                moveDialog.searchText = text
                destinationList.positionViewAtBeginning()
            }
            onAccepted: moveDialog.submitMove()
            color: "#fffffe"
            placeholderTextColor: "#77798c"
            selectByMouse: true
            background: Rectangle { color: "#0f0e17"; radius: 9; border.color: "#18ffffff" }
        }

        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true
            ListView {
                id: destinationList
                anchors.fill: parent
                clip: true
                spacing: 3
                model: moveDialog.destinations()
                delegate: NotesMoveDestinationRow {
                    required property var modelData
                    width: destinationList.width
                    destination: modelData
                    selectedTargetId: moveDialog.selectedTargetId
                    onSelected: function(targetId) { moveDialog.selectedTargetId = targetId }
                    onActivated: function(targetId) { moveDialog.selectedTargetId = targetId; moveDialog.submitMove() }
                }
            }
            Text {
                anchors.centerIn: parent
                visible: destinationList.count === 0
                text: qsTr("No matching destinations found.")
                color: "#77798c"
                font.pixelSize: 11
            }
        }

        Text {
            Layout.fillWidth: true
            visible: moveDialog.errorMessage.length > 0
            text: moveDialog.errorMessage
            color: "#fda4af"
            font.pixelSize: 10
            wrapMode: Text.Wrap
        }
    }

    footer: RowLayout {
        spacing: 10
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2
            Text { text: qsTr("New destination"); color: "#77798c"; font.pixelSize: 9 }
            Text {
                Layout.fillWidth: true
                text: moveDialog.selectedTargetId.length > 0 ? moveDialog.breadcrumbFor(moveDialog.selectedTargetId) : qsTr("Top level")
                color: "#fffffe"
                font.pixelSize: 10
                font.bold: true
                elide: Text.ElideRight
            }
        }
        Button {
            text: qsTr("Cancel")
            onClicked: moveDialog.reject()
            background: Rectangle { color: "#252435"; radius: 8; border.color: "#20ffffff" }
            contentItem: Text { text: parent.text; color: "#c4c5d4"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }
        Button {
            text: moveDialog.selectedTargetId === moveDialog.currentParentId() ? qsTr("Current location") : qsTr("Move here")
            enabled: moveDialog.selectedTargetId !== moveDialog.currentParentId()
            onClicked: moveDialog.submitMove()
            background: Rectangle { color: parent.enabled ? "#6d4bd1" : "#393746"; radius: 8 }
            contentItem: Text { text: parent.text; color: parent.enabled ? "white" : "#77798c"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }
    }
}
