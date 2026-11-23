import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: collectionRoot
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight + 8
    color: "transparent"

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
                color: "#c4b5fd"
                font.pixelSize: 11
                font.weight: Font.DemiBold
                font.capitalization: Font.AllUppercase
                font.letterSpacing: 1.0
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

        Item {
            visible: !collectionRoot.collapsed
            Layout.fillWidth: true
            Layout.leftMargin: 6
            implicitHeight: Math.max(30, bodyArea.contentHeight + 6)

            Rectangle {
                anchors.left: parent.left
                anchors.top: parent.top
                anchors.bottom: parent.bottom
                width: 1
                color: "#1affffff"
            }

            TextArea {
                id: bodyArea
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.leftMargin: 12
                padding: 0
                text: collectionRoot.innerBody
                placeholderText: qsTr("Conteúdo agrupado...")
                placeholderTextColor: "#52525b"
                color: "#cbd5e1"
                font.pixelSize: 14
                wrapMode: TextEdit.Wrap
                background: Item {}
                onEditingFinished: collectionRoot.saveUpdate(text)
            }
        }
    }
}
