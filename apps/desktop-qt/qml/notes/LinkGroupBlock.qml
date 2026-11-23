import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: linkGroupRoot
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight + 20
    radius: 12
    color: "#141320"
    border.color: "#22ffffff"
    border.width: 1

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string title: attrs["data-title"] || attrs["title"] || qsTr("Grupo de Links")
    property bool collapsed: (attrs["data-collapsed"] || "false") === "true"
    property var links: {
        var raw = attrs["data-links"] || "[]"
        try {
            var parsed = JSON.parse(raw.indexOf("%") >= 0 ? decodeURIComponent(raw) : raw)
            return Array.isArray(parsed) ? parsed : []
        } catch (e) {
            return []
        }
    }
    property bool addingLink: false

    signal attrsUpdated(var newAttrs)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function saveLinks(nextLinks) {
        var next = Object.assign({}, attrs)
        next["data-type"] = "link-group"
        next["data-title"] = title
        next["data-collapsed"] = collapsed ? "true" : "false"
        next["data-links"] = JSON.stringify(nextLinks)
        attrsUpdated(next)
    }

    ColumnLayout {
        id: mainCol
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ToolButton {
                Layout.preferredWidth: 24
                Layout.preferredHeight: 24
                onClicked: {
                    linkGroupRoot.collapsed = !linkGroupRoot.collapsed
                    linkGroupRoot.saveLinks(linkGroupRoot.links)
                }
                background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: linkGroupRoot.collapsed ? "chevron-right" : "chevron-down"
                    color: "#a7a9be"
                    width: 13
                    height: 13
                }
            }

            TextField {
                Layout.fillWidth: true
                text: linkGroupRoot.title
                color: "#fffffe"
                font.pixelSize: 13
                font.weight: Font.DemiBold
                background: null
                onEditingFinished: {
                    linkGroupRoot.title = text
                    linkGroupRoot.saveLinks(linkGroupRoot.links)
                }
            }

            Button {
                Layout.preferredHeight: 24
                padding: 8
                onClicked: linkGroupRoot.addingLink = !linkGroupRoot.addingLink
                background: Rectangle { radius: 6; color: "#228b5cf6" }
                contentItem: Text { text: qsTr("+ Link"); color: "#c4b5fd"; font.pixelSize: 11; font.weight: Font.Medium }
            }

            ToolButton {
                visible: hoverHandler.hovered
                Layout.preferredWidth: 24
                Layout.preferredHeight: 24
                onClicked: linkGroupRoot.removeRequested()
                background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 12; height: 12 }
            }
        }

        RowLayout {
            visible: linkGroupRoot.addingLink
            Layout.fillWidth: true
            spacing: 8

            TextField {
                id: newUrlInput
                Layout.fillWidth: true
                placeholderText: "https://..."
                color: "#fffffe"
                font.pixelSize: 12
                background: Rectangle { radius: 6; color: "#0f0e17"; border.color: "#33ffffff" }
            }

            Button {
                Layout.preferredHeight: 28
                onClicked: {
                    var u = newUrlInput.text.trim()
                    if (u.length === 0) return
                    var next = linkGroupRoot.links.slice()
                    next.push({ url: u, title: u })
                    linkGroupRoot.links = next
                    linkGroupRoot.saveLinks(next)
                    newUrlInput.text = ""
                    linkGroupRoot.addingLink = false
                }
                background: Rectangle { radius: 6; color: "#7c3aed" }
                contentItem: Text { text: qsTr("Adicionar"); color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            }
        }

        ColumnLayout {
            visible: !linkGroupRoot.collapsed
            Layout.fillWidth: true
            spacing: 6

            Repeater {
                model: linkGroupRoot.links
                delegate: Rectangle {
                    required property var modelData
                    required property int index
                    Layout.fillWidth: true
                    height: 34
                    radius: 7
                    color: "#0f0e17"
                    border.color: "#15ffffff"
                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 10
                        anchors.rightMargin: 8
                        spacing: 8
                        AppIcon { name: "external-link"; color: "#a78bfa"; width: 12; height: 12 }
                        Text {
                            text: modelData.title || modelData.url || ""
                            color: "#e2e8f0"
                            font.pixelSize: 12
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }
                        ToolButton {
                            Layout.preferredWidth: 22
                            Layout.preferredHeight: 22
                            onClicked: {
                                var next = linkGroupRoot.links.slice()
                                next.splice(index, 1)
                                linkGroupRoot.links = next
                                linkGroupRoot.saveLinks(next)
                            }
                            background: Rectangle { radius: 4; color: parent.hovered ? "#22ef4444" : "transparent" }
                            contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#71717a"; width: 10; height: 10 }
                        }
                    }
                    MouseArea {
                        anchors.fill: parent
                        z: -1
                        cursorShape: Qt.PointingHandCursor
                        onClicked: if (modelData.url) Qt.openUrlExternally(modelData.url)
                    }
                }
            }
        }
    }
}
