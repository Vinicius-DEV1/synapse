pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesJsonAttribute.js" as NotesJsonAttribute
import "DocumentBundleOperations.js" as DocumentBundleOperations
import "../ui"

Item {
    id: linkGroupRoot
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight + 8

    property var blockData: ({})
    property var controller: null
    property var attrs: blockData.attrs || ({})
    function parseLegacyLinkData(raw) {
        var result = NotesJsonAttribute.parseJsonAttribute(raw, true)
        if (!result.valid) {
            console.warn("[Notes:LinkGroupBlock] Could not parse legacy link metadata; editing is disabled to preserve the stored value.", result.error)
            return { valid: false, cards: [] }
        }

        var parsed = result.value
        if (!Array.isArray(parsed)) {
            console.warn("[Notes:LinkGroupBlock] Legacy link metadata must be a JSON array; editing is disabled to preserve the stored value.")
            return { valid: false, cards: [] }
        }

        var cards = []
        for (var i = 0; i < parsed.length; i++) {
            var item = parsed[i]
            if (!item || typeof item !== "object" || Array.isArray(item)
                    || (item.url !== undefined && typeof item.url !== "string")
                    || (item.title !== undefined && typeof item.title !== "string")) {
                console.warn("[Notes:LinkGroupBlock] Legacy link metadata contains an invalid card; editing is disabled to preserve the stored value.")
                return { valid: false, cards: [] }
            }
            cards.push({
                id: "lg_" + i,
                blockType: "linkPreview",
                attrs: { url: item.url || "", title: item.title || "" },
                innerHtml: "",
                html: ""
            })
        }
        return { valid: true, cards: cards }
    }

    property var linkGroupContents: {
        var inner = blockData.innerHtml || ""
        var c = linkGroupRoot.controller
        if (inner.length > 0 && c && typeof c.parseNoteBlocks === "function") {
            var parsed = DocumentBundleOperations.toArray(c.parseNoteBlocks(inner))
            var cards = parsed.filter(function(b) { return b.blockType === "linkPreview" })
            if (cards.length > 0) return { cards: cards, usesLegacyData: false, valid: true }
        }
        var raw = attrs["data-links"]
        if (raw === undefined || raw === null || raw === "") raw = "[]"
        var legacyData = linkGroupRoot.parseLegacyLinkData(raw)
        return { cards: legacyData.cards, usesLegacyData: true, valid: legacyData.valid }
    }
    property var childLinkBlocks: linkGroupContents.cards
    property bool legacyDataInvalid: linkGroupContents.usesLegacyData && !linkGroupContents.valid
    property bool addingLink: false

    signal attrsUpdated(var newAttrs)
    signal removeRequested()

    HoverHandler { id: groupHover }

    function persistCards(cards) {
        if (legacyDataInvalid) return
        var next = Object.assign({}, attrs)
        next["data-type"] = "linkGroup"
        next["data-links"] = JSON.stringify(cards.map(function(c) {
            return {
                url: (c.attrs && (c.attrs.url || c.attrs["data-url"])) || "",
                title: (c.attrs && (c.attrs.title || c.attrs["data-title"])) || ""
            }
        }))
        attrsUpdated(next)
    }

    ColumnLayout {
        id: mainCol
        anchors.fill: parent
        spacing: 8

        // Subtle hover header bar for adding a sibling link card or removing the group
        RowLayout {
            Layout.fillWidth: true
            visible: groupHover.hovered || linkGroupRoot.addingLink || linkGroupRoot.childLinkBlocks.length === 0
            spacing: 6

            Rectangle {
                Layout.preferredHeight: 24
                Layout.preferredWidth: hdrRow.implicitWidth + 14
                radius: 6
                color: "#1a1924"
                border.color: "#1affffff"
                border.width: 1

                RowLayout {
                    id: hdrRow
                    anchors.centerIn: parent
                    spacing: 6
                    AppIcon { name: "layers"; color: "#a78bfa"; width: 11; height: 11 }
                    Text {
                        text: qsTr("Grupo de Links (%1)").arg(linkGroupRoot.childLinkBlocks.length)
                        color: "#a7a9be"
                        font.pixelSize: 11
                        font.weight: Font.Medium
                    }
                }
            }

            Button {
                Layout.preferredHeight: 24
                leftPadding: 8
                rightPadding: 8
                focusPolicy: Qt.NoFocus
                enabled: !linkGroupRoot.legacyDataInvalid && linkGroupRoot.childLinkBlocks.length < 4
                onClicked: linkGroupRoot.addingLink = !linkGroupRoot.addingLink
                background: Rectangle {
                    radius: 6
                    color: parent.hovered ? "#338b5cf6" : "#1a8b5cf6"
                    border.color: "#338b5cf6"
                    border.width: 1
                }
                contentItem: Text { text: qsTr("+ Link lado a lado"); color: "#c4b5fd"; font.pixelSize: 11; font.weight: Font.Medium }
            }

            Item { Layout.fillWidth: true }

            Text {
                Layout.preferredWidth: 200
                Layout.maximumWidth: 220
                visible: linkGroupRoot.legacyDataInvalid
                text: qsTr("Links salvos inválidos; edição bloqueada para preservar os dados.")
                color: "#fbbf24"
                font.pixelSize: 10
                wrapMode: Text.Wrap
            }

            ToolButton {
                Layout.preferredWidth: 24
                Layout.preferredHeight: 24
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Remover grupo de links")
                onClicked: linkGroupRoot.removeRequested()
                background: Rectangle { radius: 6; color: parent.hovered ? "#22ef4444" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: parent.hovered ? "#fb7185" : "#a7a9be"; width: 12; height: 12 }
            }
        }

        RowLayout {
            visible: linkGroupRoot.addingLink && !linkGroupRoot.legacyDataInvalid
            Layout.fillWidth: true
            spacing: 8

            TextField {
                id: newUrlInput
                Layout.fillWidth: true
                Layout.preferredHeight: 32
                placeholderText: "https://..."
                placeholderTextColor: "#71717a"
                color: "#fffffe"
                font.pixelSize: 12
                leftPadding: 10
                background: Rectangle { radius: 8; color: "#15141b"; border.color: "#1affffff" }
            }

            Button {
                Layout.preferredHeight: 32
                leftPadding: 12
                rightPadding: 12
                onClicked: {
                    if (linkGroupRoot.legacyDataInvalid) return
                    var u = newUrlInput.text.trim()
                    if (u.length === 0) return
                    var next = linkGroupRoot.childLinkBlocks.slice()
                    next.push({
                        id: "lg_" + Date.now(),
                        blockType: "linkPreview",
                        attrs: { url: u, title: "" },
                        innerHtml: "",
                        html: ""
                    })
                    linkGroupRoot.childLinkBlocks = next
                    linkGroupRoot.persistCards(next)
                    newUrlInput.text = ""
                    linkGroupRoot.addingLink = false
                }
                background: Rectangle { radius: 8; color: parent.hovered ? "#8b5cf6" : "#7c3aed" }
                contentItem: Text { text: qsTr("Adicionar"); color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            }
        }

        // Side-by-side LinkPreviewCard columns matching LinkGroupBlock.tsx
        RowLayout {
            visible: !linkGroupRoot.legacyDataInvalid
            Layout.fillWidth: true
            spacing: 10

            Repeater {
                model: linkGroupRoot.childLinkBlocks
                delegate: LinkPreviewCard {
                    required property var modelData
                    required property int index
                    Layout.fillWidth: true
                    Layout.alignment: Qt.AlignTop
                    blockData: modelData
                    controller: linkGroupRoot.controller
                    onAttrsUpdated: function(na) {
                        var next = linkGroupRoot.childLinkBlocks.slice()
                        var copy = Object.assign({}, next[index])
                        copy.attrs = na
                        next[index] = copy
                        linkGroupRoot.childLinkBlocks = next
                        linkGroupRoot.persistCards(next)
                    }
                    onRemoveRequested: {
                        var next = linkGroupRoot.childLinkBlocks.slice()
                        next.splice(index, 1)
                        if (next.length === 0) {
                            linkGroupRoot.removeRequested()
                        } else {
                            linkGroupRoot.childLinkBlocks = next
                            linkGroupRoot.persistCards(next)
                        }
                    }
                }
            }
        }
    }
}
