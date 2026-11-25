import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

// Interactive colored Callout / Blockquote mirroring apps/web-react/src/components/editor-extensions/ColorBlockquoteComponent.tsx
Rectangle {
    id: blockquoteRoot
    Layout.fillWidth: true
    implicitHeight: Math.max(46, quoteEdit.implicitHeight + 12)
    radius: 8
    color: hasCustomColor ? colorsPalette.bgTintFor(resolvedHex) : "#0dffffff"
    border.color: quoteEdit.activeFocus || hoverHandler.hovered ? "#22ffffff" : "transparent"
    border.width: 1

    property var blockData: ({})
    property string contentHtml: ""
    property string quoteColor: "default"
    property bool showColorMenu: false
    property bool isSyncing: false
    property bool readyForUserEdits: false
    property string lastSyncedPlain: ""

    Colors { id: colorsPalette }

    readonly property string resolvedHex: {
        var c = quoteColor || "default"
        if (c === "default" || !c) return "#8b5cf6"
        return c.charAt(0) === "#" ? c : "#8b5cf6"
    }
    readonly property bool hasCustomColor: quoteColor.length > 0 && quoteColor !== "default"

    signal contentChanged(string newHtml)
    signal colorChangedByUser(string newColor)
    signal askAiRequested(string selectedText)
    signal deleteRequested()

    HoverHandler { id: hoverHandler }

    function htmlToPlain(raw) {
        return String(raw || "")
            .replace(/\r\n/g, "\n")
            .replace(/(<p\b[^>]*>)\s*<br\s*\/?>\s*<\/p>/gi, "$1</p>")
            .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<p\b[^>]*>/gi, "")
            .replace(/<\/p>/gi, "")
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"")
            .replace(/&#39;/g, "'")
            .replace(/\n{16,}/g, "\n\n\n")
            .replace(/^\n+|\n+$/g, "")
    }

    function plainToHtml(txt) {
        var lines = String(txt || "").split("\n")
        var out = ""
        for (var i = 0; i < lines.length; ++i) {
            var esc = lines[i].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            out += "<p>" + (esc.length > 0 ? esc : "<br/>") + "</p>"
        }
        return out || "<p></p>"
    }

    function flushPendingEdits() {
        if (!saveDebounce.running) return true
        saveDebounce.stop()
        if (quoteEdit.text !== lastSyncedPlain) {
            lastSyncedPlain = quoteEdit.text
            blockquoteRoot.contentChanged(blockquoteRoot.plainToHtml(quoteEdit.text))
        }
        return true
    }

    function hasPendingEdits() {
        return saveDebounce.running || (readyForUserEdits && quoteEdit.text !== lastSyncedPlain)
    }

    Timer {
        id: saveDebounce
        interval: 200
        onTriggered: {
            if (quoteEdit.text !== blockquoteRoot.lastSyncedPlain) {
                blockquoteRoot.lastSyncedPlain = quoteEdit.text
                blockquoteRoot.contentChanged(blockquoteRoot.plainToHtml(quoteEdit.text))
            }
        }
    }

    Component.onCompleted: {
        isSyncing = true
        var initialPlain = htmlToPlain(contentHtml)
        quoteEdit.text = initialPlain
        lastSyncedPlain = quoteEdit.text
        isSyncing = false
        Qt.callLater(function() {
            if (blockquoteRoot) {
                blockquoteRoot.lastSyncedPlain = quoteEdit.text
                blockquoteRoot.readyForUserEdits = true
            }
        })
    }

    Component.onDestruction: saveDebounce.stop()

    onContentHtmlChanged: {
        if (quoteEdit.activeFocus) return
        var plain = htmlToPlain(contentHtml)
        lastSyncedPlain = plain
        if (quoteEdit.text !== plain) {
            isSyncing = true
            quoteEdit.text = plain
            lastSyncedPlain = quoteEdit.text
            isSyncing = false
        }
    }

    // 3px left accent border
    Rectangle {
        anchors.left: parent.left; anchors.top: parent.top; anchors.bottom: parent.bottom
        width: 3.5; radius: 2
        color: blockquoteRoot.hasCustomColor ? blockquoteRoot.resolvedHex : "#52ffffff"
    }

    // Floating hover toolbar (Color palette + AI + Delete)
    Rectangle {
        visible: hoverHandler.hovered || blockquoteRoot.showColorMenu
        anchors.top: parent.top; anchors.topMargin: 6
        anchors.right: parent.right; anchors.rightMargin: 8
        z: 10
        height: 28; width: toolbarRow.implicitWidth + 10
        radius: 8
        color: "#ee141320"
        border.color: "#1affffff"

        RowLayout {
            id: toolbarRow
            anchors.centerIn: parent
            spacing: 4

            ToolButton {
                Layout.preferredWidth: 22; Layout.preferredHeight: 22
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered; ToolTip.text: qsTr("Cor do destaque")
                onClicked: blockquoteRoot.showColorMenu = !blockquoteRoot.showColorMenu
                background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "palette"; color: blockquoteRoot.hasCustomColor ? blockquoteRoot.resolvedHex : "#a7a9be"; width: 12; height: 12 }
            }

            ToolButton {
                Layout.preferredWidth: 22; Layout.preferredHeight: 22
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered; ToolTip.text: qsTr("Melhorar citação com IA")
                onClicked: blockquoteRoot.askAiRequested(quoteEdit.selectedText || quoteEdit.text)
                background: Rectangle { radius: 5; color: parent.hovered ? "#338b5cf6" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "sparkles"; color: "#a78bfa"; width: 12; height: 12 }
            }

            ToolButton {
                Layout.preferredWidth: 22; Layout.preferredHeight: 22
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered; ToolTip.text: qsTr("Excluir destaque")
                onClicked: blockquoteRoot.deleteRequested()
                background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: parent.hovered ? "#fb7185" : "#94a1b2"; width: 12; height: 12 }
            }
        }
    }

    // Palette popover
    Popup {
        visible: blockquoteRoot.showColorMenu
        x: parent.width - width - 8
        y: 38
        width: 210
        padding: 8
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        onClosed: blockquoteRoot.showColorMenu = false
        background: Rectangle { color: "#141320"; radius: 10; border.color: "#22ffffff" }
        contentItem: GridLayout {
            columns: 5; columnSpacing: 6; rowSpacing: 6
            Repeater {
                model: colorsPalette.bgColors
                delegate: Rectangle {
                    required property var modelData
                    width: 28; height: 28; radius: 6
                    color: modelData.value === "transparent" ? "#262533" : modelData.value
                    border.color: blockquoteRoot.quoteColor === modelData.hex ? "#8b5cf6" : "#22ffffff"
                    border.width: blockquoteRoot.quoteColor === modelData.hex ? 2 : 1
                    Text { anchors.centerIn: parent; text: "A"; color: modelData.value === "transparent" ? "#fff" : modelData.hex; font.pixelSize: 11; font.bold: true }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            var picked = modelData.value === "transparent" ? "default" : modelData.hex
                            blockquoteRoot.quoteColor = picked
                            blockquoteRoot.showColorMenu = false
                            blockquoteRoot.colorChangedByUser(picked)
                        }
                    }
                }
            }
        }
    }

    TextArea {
        id: quoteEdit
        x: 16
        y: 6
        width: Math.max(120, blockquoteRoot.width - 32)
        topPadding: 6; bottomPadding: 6
        leftPadding: 0; rightPadding: 0
        color: "#e2e8f0"
        selectionColor: "#408b5cf6"
        selectedTextColor: "#ffffff"
        font.pixelSize: 14
        wrapMode: TextEdit.Wrap
        background: null
        placeholderText: qsTr("Escreva uma citação ou destaque...")
        placeholderTextColor: "#64748b"
        onTextChanged: {
            if (blockquoteRoot.isSyncing || !blockquoteRoot.readyForUserEdits) return
            if (text === blockquoteRoot.lastSyncedPlain) {
                saveDebounce.stop()
                return
            }
            saveDebounce.restart()
        }
        onActiveFocusChanged: {
            if (!activeFocus && blockquoteRoot.readyForUserEdits) blockquoteRoot.flushPendingEdits()
        }
    }
}
