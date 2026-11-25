import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: collectionRoot
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight
    radius: 12
    color: "#0f0e17"
    border.color: "#1affffff"
    border.width: 1
    clip: true

    property var blockData: ({})
    property var controller: typeof dataController !== "undefined" ? dataController : null
    property var textOperations: typeof notesTextOperations !== "undefined" ? notesTextOperations : null
    property var pageList: []
    property string pageId: ""
    property string pageTitle: ""
    property int nestingDepth: 0
    property bool active: true

    property string titleText: ""
    property bool collapsed: false
    property string bodyHtml: "<p></p>"
    property bool isSyncingBlock: false

    signal blockChanged(var updatedBlock)
    signal pagePreviewRequested(string pageId)
    signal pageOpenRequested(string pageId)
    signal externalLinkRequested(string link)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function syncFromBlockData() {
        var a = (blockData && blockData.attrs) ? blockData.attrs : ({})
        isSyncingBlock = true
        var nextTitle = a["data-title"] || a["title"] || ""
        titleText = nextTitle
        if (!titleInput.activeFocus && titleInput.text !== nextTitle) {
            titleInput.text = nextTitle
        }
        collapsed = String(a["data-collapsed"] || "false") === "true"
        var nextHtml = (blockData && blockData.innerHtml && String(blockData.innerHtml).trim().length > 0)
            ? String(blockData.innerHtml)
            : "<p><br/></p>"
        if (nextHtml === "<p></p>") nextHtml = "<p><br/></p>"
        if (nextHtml !== bodyHtml) bodyHtml = nextHtml
        isSyncingBlock = false
    }

    Component.onCompleted: syncFromBlockData()
    onBlockDataChanged: syncFromBlockData()

    Timer {
        id: titleDebounce
        interval: 180
        repeat: false
        onTriggered: collectionRoot.emitUpdate()
    }

    function emitUpdate() {
        if (isSyncingBlock) return
        var baseAttrs = (blockData && blockData.attrs) ? blockData.attrs : ({})
        var nextAttrs = Object.assign({}, baseAttrs)
        nextAttrs["_tag"] = "div"
        nextAttrs["class"] = "group-collection"
        nextAttrs["data-type"] = "groupBlock"
        nextAttrs["title"] = titleInput.text
        nextAttrs["data-title"] = titleInput.text
        nextAttrs["data-collapsed"] = collapsed ? "true" : "false"
        blockChanged({
            id: (blockData && blockData.id) || "",
            blockType: "collectionBlock",
            attrs: nextAttrs,
            innerHtml: bodyHtml && bodyHtml.trim().length > 0 ? bodyHtml : "<p></p>",
            html: ""
        })
    }

    ColumnLayout {
        id: mainCol
        width: parent.width
        spacing: 0

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 46
            color: headerHover.hovered ? "#201f2d" : "#1a1924"
            Behavior on color { ColorAnimation { duration: 150 } }

            HoverHandler { id: headerHover }

            Rectangle {
                visible: !collectionRoot.collapsed
                anchors.bottom: parent.bottom
                anchors.left: parent.left
                anchors.right: parent.right
                height: 1
                color: "#0dffffff"
            }

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                spacing: 8

                ToolButton {
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    focusPolicy: Qt.NoFocus
                    onClicked: {
                        collectionRoot.collapsed = !collectionRoot.collapsed
                        collectionRoot.emitUpdate()
                    }
                    background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon {
                        anchors.centerIn: parent
                        name: collectionRoot.collapsed ? "chevron-right" : "chevron-down"
                        color: "#a78bfa"
                        width: 16
                        height: 16
                    }
                }

                AppIcon { name: "folder"; color: "#c4b5fd"; width: 17; height: 17 }

                TextField {
                    id: titleInput
                    Layout.fillWidth: true
                    text: collectionRoot.titleText
                    placeholderText: qsTr("Nome da Coleção...")
                    placeholderTextColor: "#4dffffff"
                    color: "#ede9fe"
                    font.pixelSize: 14
                    font.weight: Font.Bold
                    leftPadding: 2
                    background: null
                    onTextEdited: {
                        collectionRoot.titleText = text
                        titleDebounce.restart()
                    }
                    onEditingFinished: {
                        titleDebounce.stop()
                        collectionRoot.titleText = text
                        collectionRoot.emitUpdate()
                    }
                }

                ToolButton {
                    opacity: hoverHandler.hovered ? 1 : 0
                    Behavior on opacity { NumberAnimation { duration: 150 } }
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Remover coleção")
                    onClicked: collectionRoot.removeRequested()
                    background: Rectangle { radius: 6; color: parent.hovered ? "#22ef4444" : "transparent" }
                    contentItem: AppIcon {
                        anchors.centerIn: parent
                        name: "trash"
                        color: parent.hovered ? "#fb7185" : "#a7a9be"
                        width: 13
                        height: 13
                    }
                }
            }
        }

        Item {
            visible: !collectionRoot.collapsed
            Layout.fillWidth: true
            implicitHeight: Math.max(52, (innerLoader.item ? innerLoader.item.implicitHeight : 36) + 24)

            Rectangle {
                anchors.left: parent.left
                anchors.leftMargin: 16
                anchors.top: parent.top
                anchors.bottom: parent.bottom
                width: 2
                color: "#0dffffff"
            }

            Loader {
                id: innerLoader
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.top: parent.top
                anchors.leftMargin: 28
                anchors.rightMargin: 14
                anchors.topMargin: 12
                active: collectionRoot.active && !collectionRoot.collapsed
                source: collectionRoot.nestingDepth < 3 && collectionRoot.controller && typeof collectionRoot.controller.parseNoteBlocks === "function"
                    ? "NotesBlockListEditor.qml"
                    : "NotesRichTextEditor.qml"
                onLoaded: {
                    if (!item) return
                    item.sourceHtml = collectionRoot.bodyHtml
                    item.pageList = collectionRoot.pageList
                    item.controller = collectionRoot.controller
                    item.textOperations = collectionRoot.textOperations
                    if (item.hasOwnProperty("pageId")) item.pageId = collectionRoot.pageId
                    if (item.hasOwnProperty("parentPageId")) item.parentPageId = collectionRoot.pageId
                    if (item.hasOwnProperty("pageTitle")) item.pageTitle = collectionRoot.pageTitle
                    if (item.hasOwnProperty("nestingDepth")) item.nestingDepth = collectionRoot.nestingDepth + 1
                    item.active = true
                }
            }

            Connections {
                target: innerLoader.item
                ignoreUnknownSignals: true
                function onHtmlChanged(serializedHtml) {
                    collectionRoot.bodyHtml = serializedHtml
                    collectionRoot.emitUpdate()
                }
                function onContentModified(html) {
                    collectionRoot.bodyHtml = html
                    collectionRoot.emitUpdate()
                }
                function onPagePreviewRequested(pid) { collectionRoot.pagePreviewRequested(pid) }
                function onPageOpenRequested(pid) { collectionRoot.pageOpenRequested(pid) }
                function onExternalLinkRequested(lnk) { collectionRoot.externalLinkRequested(lnk) }
            }
        }
    }
}
