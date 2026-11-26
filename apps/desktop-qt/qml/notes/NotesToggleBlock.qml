import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesColorUtils.js" as NotesColorUtils
import "../ui"

Rectangle {
    id: toggleRoot
    objectName: "notesToggleBlockRoot"
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight + (isCalloutMode ? 20 : 8)
    radius: isCalloutMode ? 6 : 0
    color: isCalloutMode
        ? (hasCustomColor ? NotesColorUtils.withHexAlpha(accentColor, "18") : "#0dffffff")
        : "transparent"
    border.width: 0

    property var blockData: ({})
    property var controller: typeof dataController !== "undefined" ? dataController : null
    property var textOperations: typeof notesTextOperations !== "undefined" ? notesTextOperations : null
    property var pageList: []
    property string pageId: ""
    property string pageTitle: ""
    property int nestingDepth: 0
    property bool active: true

    property bool isCalloutMode: true
    property string accentColor: "default"
    property string titleText: ""
    property string lastCommittedTitle: ""
    property string bodyHtml: "<p></p>"
    property bool isOpen: true
    property bool showColorPicker: false
    property bool isSyncingBlock: false
    property bool isEmittingUpdate: false

    readonly property bool hasCustomColor: accentColor.length > 0 && accentColor !== "default"
    readonly property string resolvedLeftBarColor: hasCustomColor ? accentColor : "#33ffffff"

    signal blockChanged(var updatedBlock)
    signal convertToSubPageRequested(string title, string html)
    signal askAiRequested(string text)
    signal pagePreviewRequested(string pageId)
    signal pageOpenRequested(string pageId)
    signal externalLinkRequested(string link)
    signal playQuestionRequested(string batteryId, string questionId, string title)
    signal openInQuestionsRequested(string batteryId)
    signal openCalendarRequested()
    signal youtubeWatchRequested(string videoUrl, string videoTitle)
    signal mermaidFullscreenRequested(string code)
    signal habitStatsRequested(string habitId)
    signal openMediaRequested(string mediaType, string mediaId, string title)
    signal localFileTrashAfterSaveRequested(string fileId)
    signal filePreviewRequested(string fileId, string fileName, bool showOpenActions, bool playAudio, bool openFolder)
    signal removeRequested()

    HoverHandler { id: blockHover }

    function syncFromBlockData() {
        if (isEmittingUpdate) return
        var a = (blockData && blockData.attrs) ? blockData.attrs : ({})
        isSyncingBlock = true
        isCalloutMode = (blockData && blockData.blockType === "blockquoteToggle") ||
            a["data-type"] === "blockquote-toggle" ||
            String(a["class"] || "").indexOf("blockquote-toggle") >= 0
        accentColor = a["data-color"] || a["color"] || "default"
        var incomingTitle = a["data-title"] !== undefined && a["data-title"] !== ""
            ? String(a["data-title"])
            : String(a["title"] || "")
        titleText = incomingTitle
        lastCommittedTitle = incomingTitle
        if (!titleInput.activeFocus && titleInput.text !== incomingTitle) {
            titleInput.text = incomingTitle
        }
        var rawOpen = a["data-is-open"] !== undefined
            ? String(a["data-is-open"])
            : (a["data-open"] !== undefined ? String(a["data-open"]) : String(a["isopen"] || "true"))
        isOpen = rawOpen !== "false"
        var incomingHtml = (blockData && blockData.innerHtml && String(blockData.innerHtml).trim().length > 0)
            ? String(blockData.innerHtml)
            : "<p><br/></p>"
        if (incomingHtml === "<p></p>") incomingHtml = "<p><br/></p>"
        if (incomingHtml !== bodyHtml) {
            bodyHtml = incomingHtml
            if (nestedLoader.item && !nestedLoader.item.hasActiveRichFocus && nestedLoader.item.sourceHtml !== incomingHtml) {
                nestedLoader.item.sourceHtml = incomingHtml
            }
        }
        isSyncingBlock = false
    }

    function flushPendingEdits() {
        if (titleSaveDebounce.running) {
            titleSaveDebounce.stop()
            if (titleInput.text !== lastCommittedTitle) emitUpdate()
        }
        if (nestedLoader.item) {
            if (typeof nestedLoader.item.flushActiveRichSlices === "function") nestedLoader.item.flushActiveRichSlices()
            else if (typeof nestedLoader.item.commitEditorText === "function") nestedLoader.item.commitEditorText()
        }
        return true
    }

    function hasPendingEdits() {
        if (titleSaveDebounce.running) return true
        if (nestedLoader.item) {
            if (typeof nestedLoader.item.hasPendingEdits === "function" && nestedLoader.item.hasPendingEdits()) return true
            if (nestedLoader.item.hasPendingChanges === true) return true
        }
        return false
    }

    Component.onCompleted: syncFromBlockData()
    Component.onDestruction: titleSaveDebounce.stop()
    onBlockDataChanged: syncFromBlockData()
    onPageListChanged: {
        if (nestedLoader.item && nestedLoader.item.hasOwnProperty("pageList")) nestedLoader.item.pageList = pageList
    }

    Timer {
        id: titleSaveDebounce
        interval: 180
        repeat: false
        onTriggered: toggleRoot.emitUpdate()
    }

    Rectangle {
        visible: toggleRoot.isCalloutMode
        anchors.left: parent.left
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        width: 3
        radius: 1.5
        color: toggleRoot.resolvedLeftBarColor
    }

    function emitUpdate() {
        if (isSyncingBlock) return
        isEmittingUpdate = true
        lastCommittedTitle = titleInput.text
        var baseAttrs = (blockData && blockData.attrs) ? blockData.attrs : ({})
        var nextAttrs = Object.assign({}, baseAttrs)
        nextAttrs["_tag"] = "div"
        nextAttrs["class"] = isCalloutMode ? "blockquote-toggle" : "toggle-block"
        nextAttrs["data-type"] = isCalloutMode ? "blockquote-toggle" : "toggle-block"
        nextAttrs["data-title"] = titleInput.text
        nextAttrs["data-is-open"] = isOpen ? "true" : "false"
        if (isCalloutMode) {
            nextAttrs["data-color"] = accentColor || "default"
        } else {
            delete nextAttrs["data-color"]
        }
        blockChanged({
            id: (blockData && blockData.id) || "",
            blockType: isCalloutMode ? "blockquoteToggle" : "toggleBlock",
            attrs: nextAttrs,
            innerHtml: bodyHtml && bodyHtml.trim().length > 0 ? bodyHtml : "<p></p>",
            html: ""
        })
        isEmittingUpdate = false
    }

    function plainSummary(html) {
        return String(html || "")
            .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .trim()
    }

    ColumnLayout {
        id: mainCol
        anchors.fill: parent
        anchors.leftMargin: toggleRoot.isCalloutMode ? 16 : 4
        anchors.rightMargin: toggleRoot.isCalloutMode ? 14 : 6
        anchors.topMargin: toggleRoot.isCalloutMode ? 10 : 4
        anchors.bottomMargin: toggleRoot.isCalloutMode ? 10 : 4
        spacing: 6

        RowLayout {
            Layout.fillWidth: true
            spacing: 6

            ToolButton {
                Layout.preferredWidth: 24
                Layout.preferredHeight: 24
                focusPolicy: Qt.NoFocus
                onClicked: {
                    toggleRoot.isOpen = !toggleRoot.isOpen
                    toggleRoot.emitUpdate()
                }
                background: Rectangle {
                    radius: 5
                    color: parent.hovered ? "#1affffff" : "transparent"
                }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: toggleRoot.isOpen ? "chevron-down" : "chevron-right"
                    color: parent.hovered ? "#fffffe" : "#a7a9be"
                    width: 15
                    height: 15
                }
            }

            TextField {
                id: titleInput
                Layout.fillWidth: true
                text: toggleRoot.titleText
                color: "#fffffe"
                font.pixelSize: 15
                font.weight: Font.DemiBold
                leftPadding: 2
                placeholderText: toggleRoot.isCalloutMode ? qsTr("Título do destaque...") : qsTr("Lista oculta...")
                placeholderTextColor: "#66a7a9be"
                background: null
                onTextEdited: {
                    toggleRoot.titleText = text
                    titleSaveDebounce.restart()
                }
                onEditingFinished: {
                    titleSaveDebounce.stop()
                    toggleRoot.titleText = text
                    if (text !== toggleRoot.lastCommittedTitle) toggleRoot.emitUpdate()
                }
            }

            Rectangle {
                visible: toggleRoot.isCalloutMode && toggleRoot.showColorPicker
                Layout.preferredHeight: 26
                Layout.preferredWidth: calloutSwatchRow.implicitWidth + 14
                radius: 8
                color: "#1a1924"
                border.color: "#1affffff"
                border.width: 1

                RowLayout {
                    id: calloutSwatchRow
                    anchors.centerIn: parent
                    spacing: 5
                    Repeater {
                        model: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"]
                        delegate: Rectangle {
                            required property string modelData
                            width: 14
                            height: 14
                            radius: 7
                            color: modelData
                            border.color: toggleRoot.accentColor === modelData ? "#ffffff" : "#33ffffff"
                            border.width: toggleRoot.accentColor === modelData ? 1.5 : 1
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    toggleRoot.accentColor = parent.modelData
                                    toggleRoot.showColorPicker = false
                                    toggleRoot.emitUpdate()
                                }
                            }
                        }
                    }
                    ToolButton {
                        Layout.preferredWidth: 16
                        Layout.preferredHeight: 16
                        focusPolicy: Qt.NoFocus
                        ToolTip.visible: hovered
                        ToolTip.text: qsTr("Cor padrão")
                        onClicked: {
                            toggleRoot.accentColor = "default"
                            toggleRoot.showColorPicker = false
                            toggleRoot.emitUpdate()
                        }
                        background: Rectangle { radius: 8; color: "transparent"; border.color: "#33ffffff" }
                        contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#a7a9be"; width: 8; height: 8 }
                    }
                }
            }

            Rectangle {
                opacity: blockHover.hovered || titleInput.activeFocus || toggleRoot.showColorPicker ? 1 : 0
                visible: opacity > 0
                Behavior on opacity { NumberAnimation { duration: 150 } }
                Layout.preferredHeight: 26
                Layout.preferredWidth: actionRow.implicitWidth + 8
                radius: 8
                color: "#cc0f0e17"
                border.color: "#0dffffff"
                border.width: 1

                RowLayout {
                    id: actionRow
                    anchors.centerIn: parent
                    spacing: 2

                    ToolButton {
                        Layout.preferredWidth: 22
                        Layout.preferredHeight: 22
                        focusPolicy: Qt.NoFocus
                        ToolTip.visible: hovered
                        ToolTip.text: qsTr("Converter em Página")
                        onClicked: toggleRoot.convertToSubPageRequested(titleInput.text || qsTr("Sub-página"), toggleRoot.bodyHtml)
                        background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                        contentItem: AppIcon { anchors.centerIn: parent; name: "file-text"; color: parent.hovered ? "#fffffe" : "#a7a9be"; width: 13; height: 13 }
                    }

                    ToolButton {
                        Layout.preferredWidth: 22
                        Layout.preferredHeight: 22
                        focusPolicy: Qt.NoFocus
                        ToolTip.visible: hovered
                        ToolTip.text: qsTr("Assistente de IA")
                        onClicked: toggleRoot.askAiRequested(titleInput.text + "\n" + toggleRoot.plainSummary(toggleRoot.bodyHtml))
                        background: Rectangle { radius: 5; color: parent.hovered ? "#338b5cf6" : "transparent" }
                        contentItem: AppIcon { anchors.centerIn: parent; name: "sparkles"; color: "#a78bfa"; width: 13; height: 13 }
                    }

                    ToolButton {
                        Layout.preferredWidth: 22
                        Layout.preferredHeight: 22
                        focusPolicy: Qt.NoFocus
                        ToolTip.visible: hovered
                        ToolTip.text: toggleRoot.isCalloutMode ? qsTr("Converter em Toggle simples") : qsTr("Converter em Callout")
                        onClicked: {
                            toggleRoot.isCalloutMode = !toggleRoot.isCalloutMode
                            toggleRoot.emitUpdate()
                        }
                        background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                        contentItem: AppIcon { anchors.centerIn: parent; name: "list-tree"; color: parent.hovered ? "#fffffe" : "#a7a9be"; width: 13; height: 13 }
                    }

                    ToolButton {
                        visible: toggleRoot.isCalloutMode
                        Layout.preferredWidth: 22
                        Layout.preferredHeight: 22
                        focusPolicy: Qt.NoFocus
                        ToolTip.visible: hovered
                        ToolTip.text: qsTr("Cor do Destaque")
                        onClicked: toggleRoot.showColorPicker = !toggleRoot.showColorPicker
                        background: Rectangle {
                            radius: 5
                            color: toggleRoot.showColorPicker || parent.hovered ? "#1affffff" : "transparent"
                        }
                        contentItem: AppIcon { anchors.centerIn: parent; name: "palette"; color: parent.hovered ? "#fffffe" : "#a7a9be"; width: 13; height: 13 }
                    }

                    Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 12; color: "#1affffff" }

                    ToolButton {
                        Layout.preferredWidth: 22
                        Layout.preferredHeight: 22
                        focusPolicy: Qt.NoFocus
                        ToolTip.visible: hovered
                        ToolTip.text: qsTr("Excluir bloco")
                        onClicked: toggleRoot.removeRequested()
                        background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                        contentItem: AppIcon {
                            anchors.centerIn: parent
                            name: toggleRoot.isCalloutMode ? "close" : "trash"
                            color: parent.hovered ? "#f87171" : "#a7a9be"
                            width: 13
                            height: 13
                        }
                    }
                }
            }
        }

        Item {
            visible: toggleRoot.isOpen
            Layout.fillWidth: true
            Layout.leftMargin: toggleRoot.isCalloutMode ? 6 : 11
            implicitHeight: Math.max(36, nestedLoader.item ? nestedLoader.item.implicitHeight : 36)

            Rectangle {
                visible: !toggleRoot.isCalloutMode
                anchors.left: parent.left
                anchors.top: parent.top
                anchors.bottom: parent.bottom
                width: 1.5
                color: blockHover.hovered ? "#26ffffff" : "#12ffffff"
            }

            Loader {
                id: nestedLoader
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.leftMargin: toggleRoot.isCalloutMode ? 18 : 14
                active: toggleRoot.active && toggleRoot.isOpen
                source: toggleRoot.nestingDepth < 3 && toggleRoot.controller && typeof toggleRoot.controller.parseNoteBlocks === "function"
                    ? "NotesBlockListEditor.qml"
                    : "NotesRichTextEditor.qml"
                onLoaded: {
                    if (!item) return
                    item.sourceHtml = toggleRoot.bodyHtml
                    item.pageList = toggleRoot.pageList
                    item.controller = toggleRoot.controller
                    item.textOperations = toggleRoot.textOperations
                    if (item.hasOwnProperty("pageId")) item.pageId = toggleRoot.pageId
                    if (item.hasOwnProperty("parentPageId")) item.parentPageId = toggleRoot.pageId
                    if (item.hasOwnProperty("pageTitle")) item.pageTitle = toggleRoot.pageTitle
                    if (item.hasOwnProperty("nestingDepth")) item.nestingDepth = toggleRoot.nestingDepth + 1
                    item.active = true
                }
            }

            Connections {
                target: nestedLoader.item
                ignoreUnknownSignals: true
                function onHtmlChanged(serializedHtml) {
                    if (serializedHtml === toggleRoot.bodyHtml) return
                    toggleRoot.bodyHtml = serializedHtml
                    toggleRoot.emitUpdate()
                }
                function onContentModified(html) {
                    if (html === toggleRoot.bodyHtml) return
                    toggleRoot.bodyHtml = html
                    toggleRoot.emitUpdate()
                }
                function onPagePreviewRequested(pid) { toggleRoot.pagePreviewRequested(pid) }
                function onPageOpenRequested(pid) { toggleRoot.pageOpenRequested(pid) }
                function onExternalLinkRequested(lnk) { toggleRoot.externalLinkRequested(lnk) }
                function onAskAiRequested(sel) { toggleRoot.askAiRequested(sel) }
                function onPlayQuestionRequested(bid, qid, t) { toggleRoot.playQuestionRequested(bid, qid, t) }
                function onOpenInQuestionsRequested(bid) { toggleRoot.openInQuestionsRequested(bid) }
                function onOpenCalendarRequested() { toggleRoot.openCalendarRequested() }
                function onYoutubeWatchRequested(u, t) { toggleRoot.youtubeWatchRequested(u, t) }
                function onMermaidFullscreenRequested(c) { toggleRoot.mermaidFullscreenRequested(c) }
                function onHabitStatsRequested(hid) { toggleRoot.habitStatsRequested(hid) }
                function onOpenMediaRequested(mt, mid, t) { toggleRoot.openMediaRequested(mt, mid, t) }
                function onFilePreviewRequested(fileId, fileName, showOpenActions, playAudio, openFolder) {
                    toggleRoot.filePreviewRequested(fileId, fileName, showOpenActions, playAudio, openFolder)
                }
                function onLocalFileTrashAfterSaveRequested(fileId) {
                    toggleRoot.localFileTrashAfterSaveRequested(fileId)
                }
            }
        }
    }
}
