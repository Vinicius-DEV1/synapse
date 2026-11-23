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
            spacing: 12

            Repeater {
                model: colLayoutRoot.columnsData
                delegate: Rectangle {
                    id: colDelegate
                    required property var modelData
                    required property int index

                    Layout.fillWidth: true
                    Layout.preferredHeight: Math.max(110, colArea.contentHeight + 44)
                    radius: 10
                    color: "#141320"
                    border.color: colArea.activeFocus ? "#7c3aed" : "#24ffffff"
                    border.width: 1

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 6

                        RowLayout {
                            Layout.fillWidth: true
                            Text {
                                text: qsTr("Coluna ") + (colDelegate.index + 1)
                                color: "#6b7280"
                                font.pixelSize: 10
                                font.bold: true
                                Layout.fillWidth: true
                            }
                            ToolButton {
                                visible: colLayoutRoot.columnsData.length > 2
                                Layout.preferredWidth: 18
                                Layout.preferredHeight: 18
                                onClicked: {
                                    var next = colLayoutRoot.columnsData.slice()
                                    next.splice(colDelegate.index, 1)
                                    colLayoutRoot.columnsData = next
                                    colLayoutRoot.saveColumns(next)
                                }
                                background: Rectangle { radius: 4; color: parent.hovered ? "#22ef4444" : "transparent" }
                                contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#71717a"; width: 9; height: 9 }
                            }
                        }

                        TextArea {
                            id: colArea
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            text: String(colDelegate.modelData || "")
                            placeholderText: qsTr("Digite nesta coluna...")
                            placeholderTextColor: "#4b5563"
                            color: "#fffffe"
                            font.pixelSize: 13
                            wrapMode: TextEdit.Wrap
                            background: null
                            onEditingFinished: {
                                var next = colLayoutRoot.columnsData.slice()
                                next[colDelegate.index] = text
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
