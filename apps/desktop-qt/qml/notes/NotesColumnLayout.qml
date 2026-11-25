pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: colLayoutRoot
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight + 8

    property var blockData: ({})
    property var controller: typeof dataController !== "undefined" ? dataController : null
    property var textOperations: typeof notesTextOperations !== "undefined" ? notesTextOperations : null
    property var pageList: []
    property string pageId: ""
    property bool active: true
    property var columnsHtmlList: []

    signal blockChanged(var updatedBlock)
    signal pagePreviewRequested(string pageId)
    signal externalLinkRequested(string link)
    signal removeRequested()

    HoverHandler { id: groupHover }

    function extractBalancedColumns(raw) {
        var s = String(raw || "")
        var found = []
        var pos = 0
        while (pos < s.length) {
            var idx = s.indexOf("columnBlock", pos)
            if (idx < 0) break
            var openDiv = s.lastIndexOf("<div", idx)
            var gt = s.indexOf(">", idx)
            if (openDiv < 0 || gt < 0) break
            var depth = 1
            var scan = gt + 1
            while (scan < s.length && depth > 0) {
                var nextOpen = s.indexOf("<div", scan)
                var nextClose = s.indexOf("</div>", scan)
                if (nextClose < 0) { scan = s.length; break }
                if (nextOpen >= 0 && nextOpen < nextClose) {
                    depth += 1
                    scan = nextOpen + 4
                } else {
                    depth -= 1
                    if (depth === 0) {
                        var inner = s.substring(gt + 1, nextClose).trim()
                        if (controller && typeof controller.parseNoteBlocks === "function") {
                            var normBlocks = controller.parseNoteBlocks(inner || "<p></p>") || []
                            if (normBlocks.length === 1 && normBlocks[0].blockType === "richText") {
                                inner = normBlocks[0].html
                            }
                        }
                        found.push(inner.length > 0 && inner !== "<p></p>" ? inner : "<p><br/></p>")
                        pos = nextClose + 6
                        break
                    }
                    scan = nextClose + 6
                }
            }
            if (depth > 0) break
        }
        if (found.length === 0) {
            var count = Math.max(2, parseInt((blockData.attrs && blockData.attrs["data-columns"]) || "2", 10) || 2)
            for (var i = 0; i < count; i++) found.push("<p><br/></p>")
        }
        return found
    }

    function syncColumns() {
        var extracted = extractBalancedColumns(blockData.innerHtml || "")
        if (JSON.stringify(extracted) !== JSON.stringify(columnsHtmlList)) {
            columnsHtmlList = extracted
        }
    }

    Component.onCompleted: syncColumns()
    onBlockDataChanged: syncColumns()

    function saveColumns(list) {
        var inner = ""
        var colWidth = Math.round(100 / Math.max(1, list.length))
        for (var i = 0; i < list.length; i++) {
            var body = String(list[i] || "<p></p>")
            if (body.trim().length === 0) body = "<p></p>"
            inner += "<div data-type=\"columnBlock\" data-width=\"" + colWidth + "\" data-group-child=\"\" class=\"column-block\" style=\"--group-flex: " + colWidth + ";\">" + body + "</div>"
        }
        var nextAttrs = Object.assign({}, blockData.attrs || ({}))
        nextAttrs["_tag"] = "div"
        nextAttrs["data-type"] = "columnGroup"
        nextAttrs["class"] = "group-layout column-group"
        nextAttrs["data-columns"] = String(list.length)
        blockChanged({
            id: blockData.id || "",
            blockType: "columnGroup",
            attrs: nextAttrs,
            innerHtml: inner,
            html: ""
        })
    }

    ColumnLayout {
        id: mainCol
        anchors.fill: parent
        spacing: 6

        RowLayout {
            Layout.fillWidth: true
            opacity: groupHover.hovered ? 1 : 0
            visible: opacity > 0
            Behavior on opacity { NumberAnimation { duration: 150 } }
            spacing: 6

            Item { Layout.fillWidth: true }

            Rectangle {
                height: 26
                width: toolbarRow.implicitWidth + 10
                radius: 8
                color: "#cc0f0e17"
                border.color: "#14ffffff"
                border.width: 1

                RowLayout {
                    id: toolbarRow
                    anchors.centerIn: parent
                    spacing: 4

                    AppIcon { name: "layout"; color: "#a78bfa"; width: 12; height: 12 }

                    Text {
                        text: colLayoutRoot.columnsHtmlList.length + " col"
                        color: "#a7a9be"
                        font.pixelSize: 10
                        font.family: "monospace"
                    }

                    ToolButton {
                        Layout.preferredHeight: 20
                        leftPadding: 6
                        rightPadding: 6
                        focusPolicy: Qt.NoFocus
                        enabled: colLayoutRoot.columnsHtmlList.length < 4
                        onClicked: {
                            var next = colLayoutRoot.columnsHtmlList.slice()
                            next.push("<p></p>")
                            colLayoutRoot.columnsHtmlList = next
                            colLayoutRoot.saveColumns(next)
                        }
                        background: Rectangle { radius: 5; color: parent.hovered ? "#268b5cf6" : "transparent" }
                        contentItem: Text { text: "+ Coluna"; color: "#c4b5fd"; font.pixelSize: 10; font.weight: Font.DemiBold }
                    }

                    Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 12; color: "#1affffff" }

                    ToolButton {
                        Layout.preferredWidth: 20
                        Layout.preferredHeight: 20
                        focusPolicy: Qt.NoFocus
                        ToolTip.visible: hovered
                        ToolTip.text: qsTr("Remover colunas")
                        onClicked: colLayoutRoot.removeRequested()
                        background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                        contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: parent.hovered ? "#fb7185" : "#a7a9be"; width: 11; height: 11 }
                    }
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 0

            Repeater {
                model: colLayoutRoot.columnsHtmlList
                delegate: RowLayout {
                    id: colWrapper
                    required property string modelData
                    required property int index
                    Layout.fillWidth: true
                    Layout.alignment: Qt.AlignTop
                    spacing: 0

                    Rectangle {
                        visible: colWrapper.index > 0
                        Layout.preferredWidth: dividerHover.hovered ? 3 : 1
                        Layout.fillHeight: true
                        Layout.leftMargin: 12
                        Layout.rightMargin: 12
                        radius: 1.5
                        color: dividerHover.hovered ? "#8b5cf6" : (groupHover.hovered ? "#26ffffff" : "#0dffffff")
                        Behavior on color { ColorAnimation { duration: 150 } }
                        HoverHandler { id: dividerHover }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: Math.max(72, colRichEditor.implicitHeight + 16)
                        radius: 8
                        color: colRichEditor.editor.activeFocus ? "#0affffff" : (groupHover.hovered ? "#05ffffff" : "transparent")
                        border.color: colRichEditor.editor.activeFocus ? "#4d8b5cf6" : (groupHover.hovered ? "#12ffffff" : "transparent")
                        border.width: 1
                        Behavior on color { ColorAnimation { duration: 150 } }
                        Behavior on border.color { ColorAnimation { duration: 150 } }

                        ToolButton {
                            visible: groupHover.hovered && colLayoutRoot.columnsHtmlList.length > 2
                            anchors.top: parent.top
                            anchors.right: parent.right
                            anchors.margins: 4
                            z: 3
                            width: 18
                            height: 18
                            focusPolicy: Qt.NoFocus
                            ToolTip.visible: hovered
                            ToolTip.text: qsTr("Remover esta coluna")
                            onClicked: {
                                var next = colLayoutRoot.columnsHtmlList.slice()
                                next.splice(colWrapper.index, 1)
                                colLayoutRoot.columnsHtmlList = next
                                colLayoutRoot.saveColumns(next)
                            }
                            background: Rectangle { radius: 4; color: parent.hovered ? "#22ef4444" : "#1affffff" }
                            contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: parent.hovered ? "#fb7185" : "#a7a9be"; width: 9; height: 9 }
                        }

                        NotesRichTextEditor {
                            id: colRichEditor
                            anchors.left: parent.left
                            anchors.right: parent.right
                            anchors.top: parent.top
                            anchors.margins: 8
                            implicitHeight: Math.max(52, editor.contentHeight + 14)
                            sourceHtml: colWrapper.modelData || "<p></p>"
                            pageList: colLayoutRoot.pageList
                            controller: colLayoutRoot.controller
                            parentPageId: colLayoutRoot.pageId
                            textOperations: colLayoutRoot.textOperations
                            active: colLayoutRoot.active
                            onContentModified: function(html) {
                                var next = colLayoutRoot.columnsHtmlList.slice()
                                next[colWrapper.index] = html
                                colLayoutRoot.columnsHtmlList = next
                                colLayoutRoot.saveColumns(next)
                            }
                            onPagePreviewRequested: function(pid) { colLayoutRoot.pagePreviewRequested(pid) }
                            onExternalLinkRequested: function(lnk) { colLayoutRoot.externalLinkRequested(lnk) }
                        }
                    }
                }
            }
        }
    }
}
