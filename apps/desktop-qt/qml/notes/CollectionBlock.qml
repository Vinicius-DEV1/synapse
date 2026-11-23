import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: collectionRoot
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight + 18
    radius: 12
    color: "#13131f"
    border.color: accentColor + "55"
    border.width: 1

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string title: attrs["data-title"] || attrs["title"] || qsTr("Coleção")
    property string accentColor: attrs["data-color"] || "#8b5cf6"
    property bool collapsed: (attrs["data-collapsed"] || "false") === "true"
    property string innerBody: String(blockData.innerHtml || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

    signal blockChanged(var updatedBlock)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function saveUpdate(nextText) {
        var nextAttrs = Object.assign({}, attrs)
        nextAttrs["data-type"] = "groupBlock"
        nextAttrs["data-title"] = title
        nextAttrs["data-color"] = accentColor
        nextAttrs["data-collapsed"] = collapsed ? "true" : "false"
        blockChanged({
            id: blockData.id || "",
            blockType: "collectionBlock",
            attrs: nextAttrs,
            innerHtml: "<p>" + nextText + "</p>",
            html: ""
        })
    }

    ColumnLayout {
        id: mainCol
        anchors.fill: parent
        anchors.margins: 10
        spacing: 6

        RowLayout {
            Layout.fillWidth: true
            spacing: 8
            ToolButton {
                Layout.preferredWidth: 24
                Layout.preferredHeight: 24
                onClicked: {
                    collectionRoot.collapsed = !collectionRoot.collapsed
                    collectionRoot.saveUpdate(bodyArea.text)
                }
                background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: collectionRoot.collapsed ? "chevron-right" : "chevron-down"
                    color: collectionRoot.accentColor
                    width: 13
                    height: 13
                }
            }

            AppIcon { name: "folder"; color: collectionRoot.accentColor; width: 15; height: 15 }

            TextField {
                Layout.fillWidth: true
                text: collectionRoot.title
                color: "#fffffe"
                font.pixelSize: 13
                font.weight: Font.DemiBold
                background: null
                onEditingFinished: {
                    collectionRoot.title = text
                    collectionRoot.saveUpdate(bodyArea.text)
                }
            }

            ToolButton {
                visible: hoverHandler.hovered
                Layout.preferredWidth: 24
                Layout.preferredHeight: 24
                onClicked: collectionRoot.removeRequested()
                background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 12; height: 12 }
            }
        }

        TextArea {
            id: bodyArea
            visible: !collectionRoot.collapsed
            Layout.fillWidth: true
            Layout.leftMargin: 28
            text: collectionRoot.innerBody
            placeholderText: qsTr("Conteúdo agrupado...")
            placeholderTextColor: "#52525b"
            color: "#cbd5e1"
            font.pixelSize: 13
            wrapMode: TextEdit.Wrap
            background: Rectangle { radius: 6; color: "#0b0b12"; border.color: "#10ffffff" }
            onEditingFinished: collectionRoot.saveUpdate(text)
        }
    }
}
