pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"
import "../editor-extensions/columns"
import "BlockDragDrop.js" as Helpers

// Multi-column group container (up to 5 columns) with balanced drops, live % resize, ungroup, and full nested signal forwarding.
Item {
    id: colLayoutRoot
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight + 8

    property var blockData: ({})
    property var controller: null
    property var textOperations: notesTextOperations
    property var pageList: []
    property string pageId: ""
    property string pageTitle: ""
    property int nestingDepth: 0
    property bool active: true
    property var columnsHtmlList: []
    property var columnOpenTags: []
    property int columnCount: 0
    property var columnWidths: []
    property bool isEmittingColumns: false

    signal blockChanged(var updatedBlock)
    signal pagePreviewRequested(string pageId)
    signal pageOpenRequested(string pageId)
    signal externalLinkRequested(string link)
    signal askAiRequested(string selection, string blockHtml)
    signal playQuestionRequested(string batteryId, string questionId, string title)
    signal openInQuestionsRequested(string batteryId)
    signal youtubeWatchRequested(string videoUrl, string videoTitle)
    signal mermaidFullscreenRequested(string code)
    signal habitStatsRequested(string habitId)
    signal openMediaRequested(string mediaType, string mediaId, string title)
    signal unwrapRequested(var columnsList)
    signal removeRequested()

    HoverHandler { id: groupHover }

    function syncColumns() {
        if (isEmittingColumns) return
        var slices = Helpers.extractColumnSlices(blockData.innerHtml || "")
        var nextHtml = []; var widths = []; var openTags = []
        for (var i = 0; i < slices.length; ++i) {
            if (typeof slices[i] === "string") { nextHtml.push(slices[i]); widths.push(100 / Math.max(1, slices.length)); openTags.push("") }
            else { nextHtml.push(slices[i].html); widths.push(slices[i].width); openTags.push(slices[i].openTag || "") }
        }
        if (nextHtml.length === 0) {
            var count = Math.max(2, Math.min(5, parseInt((blockData.attrs && blockData.attrs["data-columns"]) || "2", 10) || 2))
            for (var j = 0; j < count; ++j) nextHtml.push("<p><br/></p>")
            widths = Helpers.computeEqualWidths(count)
            openTags = []
            for (var k = 0; k < count; ++k) openTags.push("")
        }
        var lengthChanged = nextHtml.length !== columnCount
        var contentChanged = JSON.stringify(nextHtml) !== JSON.stringify(columnsHtmlList)
        if (contentChanged) columnsHtmlList = nextHtml
        if (lengthChanged) {
            columnCount = nextHtml.length
        } else if (contentChanged) {
            for (var k = 0; k < colsRepeater.count; ++k) {
                var wrapper = colsRepeater.itemAt(k)
                var loaderItem = wrapper && wrapper.innerEditorItem ? wrapper.innerEditorItem : null
                if (loaderItem && !loaderItem.hasActiveRichFocus && loaderItem.sourceHtml !== nextHtml[k]) {
                    loaderItem.sourceHtml = nextHtml[k]
                }
            }
        }
        columnWidths = widths
        columnOpenTags = openTags
    }

    function flushPendingEdits() {
        for (var i = 0; i < colsRepeater.count; ++i) {
            var wrapper = colsRepeater.itemAt(i)
            var item = wrapper && wrapper.innerEditorItem ? wrapper.innerEditorItem : null
            if (!item) continue
            if (typeof item.flushActiveRichSlices === "function") item.flushActiveRichSlices()
            else if (typeof item.commitEditorText === "function") item.commitEditorText()
        }
        return true
    }

    function hasPendingEdits() {
        for (var i = 0; i < colsRepeater.count; ++i) {
            var wrapper = colsRepeater.itemAt(i)
            var item = wrapper && wrapper.innerEditorItem ? wrapper.innerEditorItem : null
            if (!item) continue
            if (typeof item.hasPendingEdits === "function" && item.hasPendingEdits()) return true
            if (item.hasPendingChanges === true) return true
        }
        return false
    }

    Component.onCompleted: syncColumns()
    onBlockDataChanged: syncColumns()
    onPageListChanged: {
        for (var i = 0; i < colsRepeater.count; ++i) {
            var wrapper = colsRepeater.itemAt(i)
            var item = wrapper && wrapper.innerEditorItem ? wrapper.innerEditorItem : null
            if (item && item.hasOwnProperty("pageList")) item.pageList = pageList
        }
    }

    function balanceWidths(count, explicitOpenTags) {
        var w = Helpers.computeEqualWidths(count)
        columnWidths = w
        saveColumns(columnsHtmlList, w, explicitOpenTags)
    }

    function saveColumns(list, explicitWidths, explicitOpenTags) {
        isEmittingColumns = true
        var openTags = explicitOpenTags || columnOpenTags
        if (!openTags || openTags.length !== list.length) {
            openTags = []
            for (var i = 0; i < list.length; ++i) openTags.push("")
        }
        columnOpenTags = openTags
        blockChanged(Helpers.serializeColumnsGroup(list, explicitWidths || columnWidths, blockData.attrs, blockData.id, openTags))
        isEmittingColumns = false
    }

    ColumnLayout {
        id: mainCol
        anchors.fill: parent
        spacing: 6

        RowLayout {
            Layout.fillWidth: true
            opacity: groupHover.hovered ? 1 : 0
            visible: opacity > 0
            Behavior on opacity { NumberAnimation { duration: 140 } }
            spacing: 6

            Item { Layout.fillWidth: true }

            Rectangle {
                height: 26; width: toolbarRow.implicitWidth + 12; radius: 8
                color: "#cc0f0e17"; border.color: "#14ffffff"; border.width: 1
                RowLayout {
                    id: toolbarRow; anchors.centerIn: parent; spacing: 4
                    AppIcon { name: "layout"; color: "#a78bfa"; width: 12; height: 12 }
                    Text { text: colLayoutRoot.columnCount + "/5 col"; color: "#a7a9be"; font.pixelSize: 10; font.family: "monospace" }

                    Button {
                        Layout.preferredHeight: 20; leftPadding: 6; rightPadding: 6; focusPolicy: Qt.NoFocus
                        enabled: colLayoutRoot.columnCount < 5
                        onClicked: {
                            var next = colLayoutRoot.columnsHtmlList.slice(); next.push("<p><br/></p>")
                            var tags = colLayoutRoot.columnOpenTags.slice(); tags.push("")
                            colLayoutRoot.columnOpenTags = tags
                            colLayoutRoot.columnsHtmlList = next; colLayoutRoot.columnCount = next.length; colLayoutRoot.balanceWidths(next.length)
                        }
                        background: Rectangle { radius: 5; color: parent.hovered ? "#268b5cf6" : "transparent" }
                        contentItem: Text { text: "+ Coluna"; color: parent.enabled ? "#c4b5fd" : "#64748b"; font.pixelSize: 10; font.weight: Font.DemiBold }
                    }

                    ToolButton {
                        Layout.preferredWidth: 22; Layout.preferredHeight: 20; focusPolicy: Qt.NoFocus
                        ToolTip.visible: hovered; ToolTip.text: qsTr("Balancear larguras")
                        onClicked: colLayoutRoot.balanceWidths(colLayoutRoot.columnsHtmlList.length)
                        background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                        contentItem: AppIcon { anchors.centerIn: parent; name: "columns"; color: "#a7a9be"; width: 11; height: 11 }
                    }
                    ToolButton {
                        Layout.preferredWidth: 22; Layout.preferredHeight: 20; focusPolicy: Qt.NoFocus
                        ToolTip.visible: hovered; ToolTip.text: qsTr("Desagrupar colunas")
                        onClicked: colLayoutRoot.unwrapRequested(colLayoutRoot.columnsHtmlList)
                        background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                        contentItem: AppIcon { anchors.centerIn: parent; name: "layers"; color: "#a7a9be"; width: 11; height: 11 }
                    }
                    Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 12; color: "#1affffff" }
                    ToolButton {
                        Layout.preferredWidth: 20; Layout.preferredHeight: 20; focusPolicy: Qt.NoFocus
                        ToolTip.visible: hovered; ToolTip.text: qsTr("Remover colunas")
                        onClicked: colLayoutRoot.removeRequested()
                        background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                        contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: parent.hovered ? "#fb7185" : "#a7a9be"; width: 11; height: 11 }
                    }
                }
            }
        }

        RowLayout {
            id: colsRow
            Layout.fillWidth: true
            spacing: 0

            Repeater {
                id: colsRepeater
                model: colLayoutRoot.columnCount
                delegate: RowLayout {
                    id: colWrapper
                    required property int index
                    readonly property var innerEditorItem: colInnerLoader.item
                    readonly property real colPct: (colLayoutRoot.columnWidths && colLayoutRoot.columnWidths.length > index)
                        ? colLayoutRoot.columnWidths[index] : (100 / Math.max(1, colLayoutRoot.columnCount))
                    Layout.fillWidth: true
                    Layout.preferredWidth: Math.max(80, colsRow.width * (colPct / 100.0))
                    Layout.alignment: Qt.AlignTop
                    spacing: 0

                    ColumnResizeHandle {
                        visible: colWrapper.index > 0
                        columnIndex: colWrapper.index
                        containerWidth: colsRow.width
                        columnWidths: colLayoutRoot.columnWidths
                        groupHovered: groupHover.hovered
                        onWidthsPreviewed: function(w) { colLayoutRoot.columnWidths = w }
                        onWidthsCommitted: function(w) { colLayoutRoot.saveColumns(colLayoutRoot.columnsHtmlList, w) }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: Math.max(72, (colInnerLoader.item ? colInnerLoader.item.implicitHeight : 52) + 18)
                        radius: 8
                        color: groupHover.hovered ? "#05ffffff" : "transparent"
                        border.color: groupHover.hovered ? "#12ffffff" : "transparent"
                        border.width: 1

                        Row {
                            visible: groupHover.hovered && colLayoutRoot.columnsHtmlList.length >= 2
                            anchors.top: parent.top; anchors.right: parent.right; anchors.margins: 4; z: 3; spacing: 2

                            ToolButton {
                                visible: colWrapper.index > 0; width: 18; height: 18; focusPolicy: Qt.NoFocus
                                ToolTip.visible: hovered; ToolTip.text: qsTr("Mover esquerda")
                                onClicked: {
                                    var next = colLayoutRoot.columnsHtmlList.slice(); var w = colLayoutRoot.columnWidths.slice()
                                    var tags = colLayoutRoot.columnOpenTags.slice()
                                    var t = next[colWrapper.index - 1]; next[colWrapper.index - 1] = next[colWrapper.index]; next[colWrapper.index] = t
                                    if (w.length === next.length) { var tw = w[colWrapper.index - 1]; w[colWrapper.index - 1] = w[colWrapper.index]; w[colWrapper.index] = tw }
                                    if (tags.length === next.length) { var tt = tags[colWrapper.index - 1]; tags[colWrapper.index - 1] = tags[colWrapper.index]; tags[colWrapper.index] = tt }
                                    colLayoutRoot.columnOpenTags = tags
                                    colLayoutRoot.columnsHtmlList = next; colLayoutRoot.columnWidths = w
                                    colLayoutRoot.columnCount = 0; colLayoutRoot.columnCount = next.length
                                    colLayoutRoot.saveColumns(next, w, tags)
                                }
                                background: Rectangle { radius: 4; color: parent.hovered ? "#268b5cf6" : "#1affffff" }
                                contentItem: AppIcon { anchors.centerIn: parent; name: "chevron-left"; color: "#a7a9be"; width: 9; height: 9 }
                            }
                            ToolButton {
                                visible: colWrapper.index < colLayoutRoot.columnCount - 1; width: 18; height: 18; focusPolicy: Qt.NoFocus
                                ToolTip.visible: hovered; ToolTip.text: qsTr("Mover direita")
                                onClicked: {
                                    var next = colLayoutRoot.columnsHtmlList.slice(); var w = colLayoutRoot.columnWidths.slice()
                                    var tags = colLayoutRoot.columnOpenTags.slice()
                                    var t = next[colWrapper.index + 1]; next[colWrapper.index + 1] = next[colWrapper.index]; next[colWrapper.index] = t
                                    if (w.length === next.length) { var tw = w[colWrapper.index + 1]; w[colWrapper.index + 1] = w[colWrapper.index]; w[colWrapper.index] = tw }
                                    if (tags.length === next.length) { var tt = tags[colWrapper.index + 1]; tags[colWrapper.index + 1] = tags[colWrapper.index]; tags[colWrapper.index] = tt }
                                    colLayoutRoot.columnOpenTags = tags
                                    colLayoutRoot.columnsHtmlList = next; colLayoutRoot.columnWidths = w
                                    colLayoutRoot.columnCount = 0; colLayoutRoot.columnCount = next.length
                                    colLayoutRoot.saveColumns(next, w, tags)
                                }
                                background: Rectangle { radius: 4; color: parent.hovered ? "#268b5cf6" : "#1affffff" }
                                contentItem: AppIcon { anchors.centerIn: parent; name: "chevron-right"; color: "#a7a9be"; width: 9; height: 9 }
                            }
                            ToolButton {
                                width: 18; height: 18; focusPolicy: Qt.NoFocus
                                ToolTip.visible: hovered; ToolTip.text: qsTr("Remover coluna")
                                onClicked: {
                                    var next = colLayoutRoot.columnsHtmlList.slice(); next.splice(colWrapper.index, 1)
                                    if (next.length <= 1) { colLayoutRoot.unwrapRequested(next); return }
                                    var tags = colLayoutRoot.columnOpenTags.slice(); tags.splice(colWrapper.index, 1)
                                    colLayoutRoot.columnOpenTags = tags
                                    colLayoutRoot.columnsHtmlList = next; colLayoutRoot.columnCount = next.length; colLayoutRoot.balanceWidths(next.length, tags)
                                }
                                background: Rectangle { radius: 4; color: parent.hovered ? "#22ef4444" : "#1affffff" }
                                contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: parent.hovered ? "#fb7185" : "#a7a9be"; width: 9; height: 9 }
                            }
                        }

                        Loader {
                            id: colInnerLoader
                            anchors.left: parent.left; anchors.right: parent.right; anchors.top: parent.top; anchors.margins: 8
                            active: colLayoutRoot.active
                            source: colLayoutRoot.nestingDepth < 2 && colLayoutRoot.controller && typeof colLayoutRoot.controller.parseNoteBlocks === "function"
                                ? "BlockListEditor.qml" : "NotesRichTextEditor.qml"
                            onLoaded: {
                                if (!item) return
                                var colHtml = (colLayoutRoot.columnsHtmlList && colWrapper.index < colLayoutRoot.columnsHtmlList.length)
                                    ? colLayoutRoot.columnsHtmlList[colWrapper.index] : "<p><br/></p>"
                                item.sourceHtml = colHtml || "<p></p>"
                                item.pageList = colLayoutRoot.pageList; item.controller = colLayoutRoot.controller
                                item.textOperations = colLayoutRoot.textOperations
                                if (item.hasOwnProperty("pageId")) item.pageId = colLayoutRoot.pageId
                                if (item.hasOwnProperty("parentPageId")) item.parentPageId = colLayoutRoot.pageId
                                if (item.hasOwnProperty("pageTitle")) item.pageTitle = colLayoutRoot.pageTitle
                                if (item.hasOwnProperty("nestingDepth")) item.nestingDepth = colLayoutRoot.nestingDepth + 1
                                item.active = true
                            }
                        }

                        Connections {
                            target: colInnerLoader.item; ignoreUnknownSignals: true
                            function onHtmlChanged(html) {
                                if (colWrapper.index < 0 || colWrapper.index >= colLayoutRoot.columnsHtmlList.length) return
                                if (colLayoutRoot.columnsHtmlList[colWrapper.index] === html) return
                                colLayoutRoot.columnsHtmlList[colWrapper.index] = html
                                colLayoutRoot.saveColumns(colLayoutRoot.columnsHtmlList)
                            }
                            function onContentModified(html) {
                                if (colWrapper.index < 0 || colWrapper.index >= colLayoutRoot.columnsHtmlList.length) return
                                if (colLayoutRoot.columnsHtmlList[colWrapper.index] === html) return
                                colLayoutRoot.columnsHtmlList[colWrapper.index] = html
                                colLayoutRoot.saveColumns(colLayoutRoot.columnsHtmlList)
                            }
                            function onPagePreviewRequested(pid) { colLayoutRoot.pagePreviewRequested(pid) }
                            function onPageOpenRequested(pid) { colLayoutRoot.pageOpenRequested(pid) }
                            function onExternalLinkRequested(lnk) { colLayoutRoot.externalLinkRequested(lnk) }
                            function onAskAiRequested(sel, bHtml) { colLayoutRoot.askAiRequested(sel, bHtml) }
                            function onPlayQuestionRequested(bid, qid, t) { colLayoutRoot.playQuestionRequested(bid, qid, t) }
                            function onOpenInQuestionsRequested(bid) { colLayoutRoot.openInQuestionsRequested(bid) }
                            function onYoutubeWatchRequested(u, t) { colLayoutRoot.youtubeWatchRequested(u, t) }
                            function onMermaidFullscreenRequested(c) { colLayoutRoot.mermaidFullscreenRequested(c) }
                            function onHabitStatsRequested(hid) { colLayoutRoot.habitStatsRequested(hid) }
                            function onOpenMediaRequested(mt, mid, t) { colLayoutRoot.openMediaRequested(mt, mid, t) }
                        }
                    }
                }
            }
        }
    }
}
