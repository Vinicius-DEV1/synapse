pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: colLayoutRoot
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight + 12

    property var blockData: ({})
    property var columnsData: {
        var raw = blockData.innerHtml || ""
        var regex = /<div\b[^>]*data-type="columnBlock"[^>]*>([\s\S]*?)<\/div>/gi
        var found = []
        var match
        while ((match = regex.exec(raw)) !== null) {
            found.push(String(match[1] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
        }
        if (found.length === 0) {
            var count = Math.max(2, parseInt((blockData.attrs && blockData.attrs["data-columns"]) || "2", 10) || 2)
            for (var i = 0; i < count; i++) found.push("")
        }
        return found
    }

    signal blockChanged(var updatedBlock)
    signal removeRequested()

    HoverHandler { id: groupHover }

    function saveColumns(list) {
        var inner = ""
        for (var i = 0; i < list.length; i++) {
            var safe = String(list[i] || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            inner += "<div data-type=\"columnBlock\"><p>" + safe + "</p></div>"
        }
        var nextAttrs = Object.assign({}, blockData.attrs || ({}))
        nextAttrs["data-type"] = "columnGroup"
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
            visible: groupHover.hovered
            spacing: 6

            Rectangle {
                height: 26
                width: toolbarRow.implicitWidth + 14
                radius: 7
                color: "#181726"
                border.color: "#22ffffff"

                RowLayout {
                    id: toolbarRow
                    anchors.centerIn: parent
                    spacing: 4

                    ToolButton {
                        Layout.preferredHeight: 22
                        padding: 4
                        enabled: colLayoutRoot.columnsData.length < 4
                        onClicked: {
                            var next = colLayoutRoot.columnsData.slice()
                            next.push("")
                            colLayoutRoot.columnsData = next
                            colLayoutRoot.saveColumns(next)
                        }
                        background: Rectangle { radius: 4; color: parent.hovered ? "#1affffff" : "transparent" }
                        contentItem: Text { text: "+ Coluna"; color: "#c4b5fd"; font.pixelSize: 10; font.weight: Font.Medium }
                    }

                    ToolButton {
                        Layout.preferredHeight: 22
                        padding: 4
                        onClicked: colLayoutRoot.removeRequested()
                        background: Rectangle { radius: 4; color: parent.hovered ? "#22ef4444" : "transparent" }
                        contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 11; height: 11 }
                    }
                }
            }
            Item { Layout.fillWidth: true }
        }

        RowLayout {
            id: columnsRow
            Layout.fillWidth: true
            spacing: 0

            Repeater {
                model: colLayoutRoot.columnsData
                delegate: RowLayout {
                    id: colWrapper
                    required property var modelData
                    required property int index
                    Layout.fillWidth: true
                    spacing: 0

                    Rectangle {
                        id: gutterDivider
                        visible: colWrapper.index > 0
                        Layout.preferredWidth: dividerHover.hovered ? 3 : 1
                        Layout.fillHeight: true
                        Layout.leftMargin: 10
                        Layout.rightMargin: 10
                        radius: 1
                        color: dividerHover.hovered ? "#8b5cf6" : (groupHover.hovered ? "#2effffff" : "#12ffffff")
                        HoverHandler { id: dividerHover }
                    }

                    Rectangle {
                        id: colDelegate
                        Layout.fillWidth: true
                        Layout.preferredHeight: Math.max(76, colArea.contentHeight + 18)
                        radius: 8
                        color: colArea.activeFocus ? "#08ffffff" : "transparent"
                        border.color: colArea.activeFocus ? "#448b5cf6" : (groupHover.hovered ? "#0cffffff" : "transparent")
                        border.width: 1

                        ToolButton {
                            visible: groupHover.hovered && colLayoutRoot.columnsData.length > 2
                            anchors.top: parent.top
                            anchors.right: parent.right
                            anchors.margins: 4
                            z: 2
                            width: 18
                            height: 18
                            onClicked: {
                                var next = colLayoutRoot.columnsData.slice()
                                next.splice(colWrapper.index, 1)
                                colLayoutRoot.columnsData = next
                                colLayoutRoot.saveColumns(next)
                            }
                            background: Rectangle { radius: 4; color: parent.hovered ? "#22ef4444" : "#1affffff" }
                            contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#a7a9be"; width: 9; height: 9 }
                        }

                        TextArea {
                            id: colArea
                            anchors.fill: parent
                            anchors.margins: 6
                            padding: 0
                            text: String(colWrapper.modelData || "")
                            placeholderText: qsTr("Digite aqui...")
                            placeholderTextColor: "#4b5563"
                            color: "#e6fffffe"
                            font.pixelSize: 15
                            wrapMode: TextEdit.Wrap
                            background: Item {}
                            onEditingFinished: {
                                var next = colLayoutRoot.columnsData.slice()
                                next[colWrapper.index] = text
                                colLayoutRoot.columnsData = next
                                colLayoutRoot.saveColumns(next)
                            }
                        }
                    }
                }
            }
        }
    }
}
