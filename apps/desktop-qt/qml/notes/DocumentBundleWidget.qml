pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesJsonAttribute.js" as NotesJsonAttribute
import "../ui"

Rectangle {
    id: bundleWidgetRoot
    Layout.fillWidth: true
    implicitHeight: contentCol.implicitHeight + 12
    radius: 8

    property var blockData: ({})
    property var controller: null
    property string pageId: ""
    property var attrs: blockData.attrs || ({})
    property string title: attrs["data-title"] || attrs["title"] || qsTr("Documentos")
    property string accentColor: attrs["data-color"] || attrs["color"] || "default"
    function parseBundleItems() {
        var raw = attrs["data-items"]
        if (raw === undefined || raw === null || raw === "") raw = attrs["items"]
        if (raw === undefined || raw === null || raw === "") raw = "[]"

        var result = typeof raw === "string"
            ? NotesJsonAttribute.parseJsonAttribute(raw, true)
            : { valid: Array.isArray(raw), value: raw, error: "Expected a JSON array." }
        if (!result.valid) {
            console.warn("[Notes:DocumentBundle] Could not parse bundled file metadata; editing is disabled to preserve the stored value.", result.error)
            return { valid: false, items: [] }
        }

        if (!Array.isArray(result.value)) {
            console.warn("[Notes:DocumentBundle] Bundled file metadata must be an array; editing is disabled to preserve the stored value.")
            return { valid: false, items: [] }
        }

        for (var i = 0; i < result.value.length; i++) {
            var item = result.value[i]
            var itemId = item && (item.fileId || item.id)
            if (!item || typeof item !== "object" || Array.isArray(item)
                    || typeof itemId !== "string" || itemId.length === 0) {
                console.warn("[Notes:DocumentBundle] Bundled file metadata contains an invalid item; editing is disabled to preserve the stored value.")
                return { valid: false, items: [] }
            }
        }
        return { valid: true, items: result.value }
    }
    property var itemsState: parseBundleItems()
    property var items: itemsState.items
    property bool itemsInvalid: !itemsState.valid
    property var uniqueExtensions: {
        var seen = ({})
        var out = []
        for (var i = 0; i < items.length; i++) {
            var it = items[i] || ({})
            var nm = String(it.name || it.title || "")
            var dot = nm.lastIndexOf(".")
            var ext = dot > 0 ? nm.substring(dot).toUpperCase() : String(it.fileType || "DOC").toUpperCase()
            if (ext && !seen[ext]) {
                seen[ext] = true
                out.push(ext)
                if (out.length >= 3) break
            }
        }
        return out
    }
    property bool renaming: false
    property bool showColorPicker: false
    property bool expanded: false
    property bool isModalOpen: false
    property bool deleteDialogOpen: false
    property string deleteActionError: ""
    property bool autoOpenConsumed: false

    Component.onCompleted: {
        if (!autoOpenConsumed && !itemsInvalid && (attrs["data-auto-open"] || "") === "true" && items.length === 0) {
            autoOpenConsumed = true
            isModalOpen = true
        }
    }

    readonly property bool hasCustomColor: accentColor.length > 0 && accentColor !== "default"

    color: hasCustomColor
        ? (accentColor + "18")
        : (hoverHandler.hovered ? "#338b5cf6" : "#1a8b5cf6")
    border.color: hasCustomColor
        ? (hoverHandler.hovered ? accentColor : (accentColor + "60"))
        : "#338b5cf6"
    border.width: activeFocus ? 2 : 1
    Behavior on color { ColorAnimation { duration: 150 } }
    Behavior on border.color { ColorAnimation { duration: 150 } }

    signal attrsUpdated(var newAttrs)
    signal pageOpenRequested(string pageId)
    signal unlinkRequested()
    signal ungroupRequested(var bundledItems, string groupColor)

    Keys.priority: Keys.BeforeItem
    Keys.onPressed: function(event) {
        if (event.modifiers !== Qt.NoModifier || bundleWidgetRoot.renaming ||
                bundleWidgetRoot.isModalOpen || bundleWidgetRoot.deleteDialogOpen) return
        if (event.key === Qt.Key_Delete || event.key === Qt.Key_Backspace) {
            event.accepted = true
            bundleWidgetRoot.requestDeleteConfirmation()
        }
    }

    HoverHandler { id: hoverHandler }

    function saveBundle(nextTitle, nextColor, nextItems) {
        if (itemsInvalid) return false
        var next = Object.assign({}, attrs)
        next["data-type"] = "document-bundle"
        next["data-title"] = nextTitle
        if (nextColor && nextColor !== "default") next["data-color"] = nextColor
        else delete next["data-color"]
        delete next["data-auto-open"]
        next["data-items"] = JSON.stringify(nextItems)
        attrsUpdated(next)
        return true
    }

    function requestDeleteConfirmation() {
        deleteActionError = ""
        deleteDialogOpen = true
    }

    function setDeleteActionError(message) {
        deleteActionError = String(message || "")
    }

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 10
        anchors.topMargin: 6
        anchors.bottomMargin: 6
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            // Icon with floating badge count matching DocumentBundleNodeView.tsx
            Item {
                Layout.preferredWidth: 32
                Layout.preferredHeight: 32
                Layout.rightMargin: 2

                Rectangle {
                    anchors.fill: parent
                    radius: 8
                    color: "#0f0e17"
                    border.color: "#0dffffff"
                    border.width: 1

                    AppIcon {
                        anchors.centerIn: parent
                        name: "layers"
                        color: "#a78bfa"
                        width: 16
                        height: 16
                    }
                }

                Rectangle {
                    anchors.top: parent.top
                    anchors.right: parent.right
                    anchors.topMargin: -4
                    anchors.rightMargin: -5
                    height: 15
                    width: Math.max(15, countTxt.implicitWidth + 6)
                    radius: 7.5
                    color: "#8b5cf6"
                    Text {
                        id: countTxt
                        anchors.centerIn: parent
                        text: String(bundleWidgetRoot.items.length)
                        color: "#ffffff"
                        font.pixelSize: 9
                        font.family: "monospace"
                        font.bold: true
                    }
                }
            }

            // Inline rename field
            RowLayout {
                visible: bundleWidgetRoot.renaming && !bundleWidgetRoot.itemsInvalid
                Layout.fillWidth: true
                spacing: 4

                TextField {
                    id: bundleRenameInput
                    Layout.preferredWidth: 200
                    Layout.preferredHeight: 26
                    text: bundleWidgetRoot.title
                    color: "#fffffe"
                    font.pixelSize: 12
                    font.weight: Font.Medium
                    leftPadding: 6
                    rightPadding: 6
                    background: Rectangle {
                        radius: 4
                        color: "#66000000"
                        border.color: "#cc8b5cf6"
                        border.width: 1
                    }
                    onAccepted: {
                        if (bundleWidgetRoot.itemsInvalid) {
                            bundleWidgetRoot.renaming = false
                            return
                        }
                        var trimmed = text.trim() || qsTr("Documentos")
                        bundleWidgetRoot.title = trimmed
                        bundleWidgetRoot.renaming = false
                        bundleWidgetRoot.saveBundle(trimmed, bundleWidgetRoot.accentColor, bundleWidgetRoot.items)
                    }
                    Keys.onEscapePressed: bundleWidgetRoot.renaming = false
                }

                ToolButton {
                    Layout.preferredWidth: 22
                    Layout.preferredHeight: 22
                    focusPolicy: Qt.NoFocus
                    onClicked: bundleRenameInput.accepted()
                    background: Rectangle { radius: 4; color: parent.hovered ? "#3310b981" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "check"; color: "#34d399"; width: 13; height: 13 }
                }

                ToolButton {
                    Layout.preferredWidth: 22
                    Layout.preferredHeight: 22
                    focusPolicy: Qt.NoFocus
                    onClicked: bundleWidgetRoot.renaming = false
                    background: Rectangle { radius: 4; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#a7a9be"; width: 12; height: 12 }
                }
            }

            // Title & extension badges
            RowLayout {
                visible: !bundleWidgetRoot.renaming || bundleWidgetRoot.itemsInvalid
                Layout.fillWidth: true
                spacing: 8

                Text {
                    Layout.fillWidth: true
                    text: bundleWidgetRoot.title
                    color: hoverHandler.hovered ? "#ffffff" : "#f4f4f5"
                    font.pixelSize: 12
                    font.weight: Font.Medium
                    elide: Text.ElideRight

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            bundleWidgetRoot.forceActiveFocus()
                            bundleWidgetRoot.expanded = !bundleWidgetRoot.expanded
                        }
                        onDoubleClicked: {
                            if (bundleWidgetRoot.itemsInvalid) return
                            bundleWidgetRoot.renaming = true
                            bundleRenameInput.forceActiveFocus()
                        }
                    }
                }

                RowLayout {
                    spacing: 4
                    Repeater {
                        model: bundleWidgetRoot.uniqueExtensions
                        delegate: Rectangle {
                            required property string modelData
                            Layout.preferredHeight: 18
                            Layout.preferredWidth: extTxt.implicitWidth + 8
                            radius: 4
                            color: "#0dffffff"
                            border.color: "#0dffffff"
                            border.width: 1
                            Text {
                                id: extTxt
                                anchors.centerIn: parent
                                text: modelData
                                color: "#a1a1aa"
                                font.pixelSize: 9
                                font.family: "monospace"
                            }
                        }
                    }
                }
            }

            Text {
                visible: bundleWidgetRoot.itemsInvalid
                text: qsTr("Itens salvos inválidos; edição bloqueada para preservar os dados.")
                color: "#fbbf24"
                font.pixelSize: 10
                wrapMode: Text.Wrap
                Layout.fillWidth: true
            }

            // Color picker popover
            Rectangle {
                visible: bundleWidgetRoot.showColorPicker && !bundleWidgetRoot.itemsInvalid
                Layout.preferredHeight: 24
                Layout.preferredWidth: bundleSwatchRow.implicitWidth + 12
                radius: 6
                color: "#1a1924"
                border.color: "#22ffffff"
                border.width: 1

                RowLayout {
                    id: bundleSwatchRow
                    anchors.centerIn: parent
                    spacing: 5
                    Repeater {
                        model: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"]
                        delegate: Rectangle {
                            required property string modelData
                            width: 13
                            height: 13
                            radius: 6.5
                            color: modelData
                            border.color: bundleWidgetRoot.accentColor === modelData ? "#ffffff" : "#33ffffff"
                            border.width: 1
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    if (bundleWidgetRoot.itemsInvalid) return
                                    bundleWidgetRoot.accentColor = modelData
                                    bundleWidgetRoot.showColorPicker = false
                                    bundleWidgetRoot.saveBundle(bundleWidgetRoot.title, modelData, bundleWidgetRoot.items)
                                }
                            }
                        }
                    }
                }
            }

            // Hover-revealed quick actions matching DocumentBundleNodeView.tsx
            RowLayout {
                opacity: hoverHandler.hovered || bundleWidgetRoot.showColorPicker || bundleWidgetRoot.expanded ? 1 : 0
                Behavior on opacity { NumberAnimation { duration: 150 } }
                spacing: 2

                ToolButton {
                    visible: !bundleWidgetRoot.renaming && !bundleWidgetRoot.itemsInvalid
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Renomear agrupamento")
                    onClicked: {
                        if (bundleWidgetRoot.itemsInvalid) return
                        bundleWidgetRoot.renaming = true
                        bundleRenameInput.forceActiveFocus()
                    }
                    background: Rectangle { radius: 5; color: parent.hovered ? "#4d000000" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "edit"; color: parent.hovered ? "#fffffe" : "#a7a9be"; width: 12; height: 12 }
                }

                ToolButton {
                    visible: !bundleWidgetRoot.itemsInvalid
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    enabled: !bundleWidgetRoot.itemsInvalid
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Personalizar cor do widget")
                    onClicked: bundleWidgetRoot.showColorPicker = !bundleWidgetRoot.showColorPicker
                    background: Rectangle { radius: 5; color: parent.hovered ? "#4d000000" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "palette"; color: parent.hovered ? "#fffffe" : "#a7a9be"; width: 12; height: 12 }
                }

                ToolButton {
                    visible: !bundleWidgetRoot.itemsInvalid
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    enabled: !bundleWidgetRoot.itemsInvalid
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Adicionar item ao pacote")
                    onClicked: bundleWidgetRoot.isModalOpen = true
                    background: Rectangle { radius: 5; color: parent.hovered ? "#4d000000" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "plus"; color: parent.hovered ? "#fffffe" : "#a7a9be"; width: 12; height: 12 }
                }

                ToolButton {
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Remover agrupamento")
                    onClicked: bundleWidgetRoot.requestDeleteConfirmation()
                    background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: parent.hovered ? "#f87171" : "#a7a9be"; width: 12; height: 12 }
                }
            }
        }

        // Expandable bundled items drawer
        Flow {
            Layout.fillWidth: true
            spacing: 6
            visible: bundleWidgetRoot.expanded && bundleWidgetRoot.items.length > 0 && !bundleWidgetRoot.itemsInvalid

            Repeater {
                model: bundleWidgetRoot.items
                delegate: Rectangle {
                    id: itemDelegate
                    required property var modelData
                    required property int index
                    height: 28
                    width: itemRow.implicitWidth + 16
                    radius: 6
                    color: itemMouse.containsMouse ? "#268b5cf6" : "#0f0e17"
                    border.color: itemMouse.containsMouse ? "#4d8b5cf6" : "#1affffff"
                    border.width: 1

                    RowLayout {
                        id: itemRow
                        anchors.centerIn: parent
                        spacing: 6
                        AppIcon { name: "file-text"; color: "#a78bfa"; width: 12; height: 12 }
                        Text {
                            text: itemDelegate.modelData.name || itemDelegate.modelData.title || qsTr("Documento")
                            color: "#e2e8f0"
                            font.pixelSize: 11
                            font.weight: Font.Medium
                        }
                        AppIcon {
                            name: "close"
                            color: "#71717a"
                            width: 10
                            height: 10
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    if (bundleWidgetRoot.itemsInvalid) return
                                    var next = bundleWidgetRoot.items.slice()
                                    next.splice(itemDelegate.index, 1)
                                    bundleWidgetRoot.saveBundle(bundleWidgetRoot.title, bundleWidgetRoot.accentColor, next)
                                }
                            }
                        }
                    }

                    MouseArea {
                        id: itemMouse
                        anchors.fill: parent
                        z: -1
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            var c = bundleWidgetRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
                            var targetId = itemDelegate.modelData.fileId || itemDelegate.modelData.id || ""
                            if (targetId && c && typeof c.previewLocalFile === "function") c.previewLocalFile(targetId)
                        }
                    }
                }
            }
        }
    }

    DocumentBundleModal {
        controller: bundleWidgetRoot.controller
        pageId: bundleWidgetRoot.pageId
        isOpen: bundleWidgetRoot.isModalOpen && !bundleWidgetRoot.itemsInvalid
        existingIds: bundleWidgetRoot.items.map(function(it) { return it.fileId || it.id || "" })
        onFileSelected: function(fileItem) {
            if (bundleWidgetRoot.itemsInvalid) {
                bundleWidgetRoot.isModalOpen = false
                return
            }
            var next = bundleWidgetRoot.items.slice()
            var exists = next.some(function(it) { return (it.fileId || it.id) === fileItem.id })
            if (!exists) {
                next.push({ id: fileItem.id, fileId: fileItem.id, name: fileItem.name || "Documento", fileType: fileItem.file_type || "doc", fileSize: Number(fileItem.file_size || 0) })
                bundleWidgetRoot.saveBundle(bundleWidgetRoot.title, bundleWidgetRoot.accentColor, next)
            }
            bundleWidgetRoot.isModalOpen = false
        }
        onAbsorbFilesRequested: function(filesList) {
            if (bundleWidgetRoot.itemsInvalid) {
                bundleWidgetRoot.isModalOpen = false
                return
            }
            var next = bundleWidgetRoot.items.slice()
            for (var i = 0; i < filesList.length; ++i) {
                var f = filesList[i]
                if (!next.some(function(it) { return (it.fileId || it.id) === f.id })) {
                    next.push({ id: f.id, fileId: f.id, name: f.name || "Documento", fileType: f.file_type || "doc", fileSize: Number(f.file_size || 0) })
                }
            }
            bundleWidgetRoot.saveBundle(bundleWidgetRoot.title, bundleWidgetRoot.accentColor, next)
            bundleWidgetRoot.isModalOpen = false
        }
        onClosed: {
            bundleWidgetRoot.isModalOpen = false
            if ((bundleWidgetRoot.attrs["data-auto-open"] || "") === "true") {
                var cleaned = Object.assign({}, bundleWidgetRoot.attrs)
                delete cleaned["data-auto-open"]
                bundleWidgetRoot.attrsUpdated(cleaned)
            }
        }
    }

    DocumentBundleDeleteDialog {
        isOpen: bundleWidgetRoot.deleteDialogOpen
        bundleTitle: bundleWidgetRoot.title
        errorMessage: bundleWidgetRoot.deleteActionError
        itemCount: bundleWidgetRoot.items.length
        itemsInvalid: bundleWidgetRoot.itemsInvalid
        onUnlinkRequested: bundleWidgetRoot.unlinkRequested()
        onUngroupRequested: bundleWidgetRoot.ungroupRequested(
                                bundleWidgetRoot.items, bundleWidgetRoot.accentColor)
        onDismissed: {
            bundleWidgetRoot.deleteDialogOpen = false
            bundleWidgetRoot.deleteActionError = ""
        }
    }
}
