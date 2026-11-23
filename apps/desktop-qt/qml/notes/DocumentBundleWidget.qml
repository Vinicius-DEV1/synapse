pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: bundleWidgetRoot
    Layout.fillWidth: true
    implicitHeight: contentCol.implicitHeight + 24
    radius: 12
    color: "#16161e"
    border.color: hoverHandler.hovered ? "#448b5cf6" : "#2e2e38"
    border.width: 1

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string title: attrs["data-title"] || attrs["title"] || qsTr("Pacote de Documentos")
    property var items: {
        var raw = attrs["data-items"] || attrs["items"] || "[]"
        try {
            var parsed = JSON.parse(raw.indexOf("%") >= 0 ? decodeURIComponent(raw) : raw)
            return Array.isArray(parsed) ? parsed : []
        } catch (e) {
            return []
        }
    }
    property bool isModalOpen: false

    signal attrsUpdated(var newAttrs)
    signal pageOpenRequested(string pageId)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function saveItems(nextItems) {
        var next = Object.assign({}, attrs)
        next["data-type"] = "document-bundle"
        next["data-title"] = title
        next["data-items"] = JSON.stringify(nextItems)
        attrsUpdated(next)
    }

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        anchors.margins: 12
        spacing: 10

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            AppIcon { name: "notes"; color: "#8b5cf6"; Layout.preferredWidth: 16; Layout.preferredHeight: 16 }
            Text {
                text: bundleWidgetRoot.title
                color: "#fffffe"
                font.pixelSize: 13
                font.weight: Font.DemiBold
                Layout.fillWidth: true
                elide: Text.ElideRight
            }

            Button {
                Layout.preferredHeight: 26
                Layout.preferredWidth: 88
                focusPolicy: Qt.NoFocus
                onClicked: bundleWidgetRoot.isModalOpen = true
                background: Rectangle { radius: 6; color: parent.hovered ? "#2e2e38" : "#1f1f2e"; border.color: "#3a3a4c" }
                contentItem: RowLayout {
                    anchors.centerIn: parent
                    spacing: 4
                    AppIcon { name: "plus"; color: "#a78bfa"; width: 12; height: 12 }
                    Text { text: qsTr("Adicionar"); color: "#c4b5fd"; font.pixelSize: 11 }
                }
            }

            ToolButton {
                visible: hoverHandler.hovered
                Layout.preferredWidth: 26
                Layout.preferredHeight: 26
                focusPolicy: Qt.NoFocus
                onClicked: bundleWidgetRoot.removeRequested()
                background: Rectangle { radius: 6; color: parent.hovered ? "#22ef4444" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 12; height: 12 }
            }
        }

        Text {
            visible: bundleWidgetRoot.items.length === 0
            text: qsTr("Nenhuma página vinculada. Clique em Adicionar para agrupar páginas.")
            color: "#6b7280"
            font.pixelSize: 11
            wrapMode: Text.Wrap
            Layout.fillWidth: true
        }

        Flow {
            Layout.fillWidth: true
            spacing: 6
            visible: bundleWidgetRoot.items.length > 0

            Repeater {
                model: bundleWidgetRoot.items
                delegate: Rectangle {
                    id: itemDelegate
                    required property var modelData
                    required property int index
                    height: 28
                    width: itemRow.implicitWidth + 16
                    radius: 6
                    color: itemMouse.containsMouse ? "#281b38" : "#0f0e17"
                    border.color: itemMouse.containsMouse ? "#7c3aed" : "#2e2e38"

                    RowLayout {
                        id: itemRow
                        anchors.centerIn: parent
                        spacing: 6
                        Text { text: itemDelegate.modelData.icon || "📄"; font.pixelSize: 12 }
                        Text {
                            text: itemDelegate.modelData.title || qsTr("Página")
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
                                    var next = bundleWidgetRoot.items.slice()
                                    next.splice(itemDelegate.index, 1)
                                    bundleWidgetRoot.saveItems(next)
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
                        onClicked: if (itemDelegate.modelData.id) bundleWidgetRoot.pageOpenRequested(itemDelegate.modelData.id)
                    }
                }
            }
        }
    }

    DocumentBundleModal {
        isOpen: bundleWidgetRoot.isModalOpen
        onPageSelected: function(page) {
            var next = bundleWidgetRoot.items.slice()
            var exists = next.some(function(it) { return it.id === page.id })
            if (!exists) {
                next.push({ id: page.id, title: page.title || "Sem título", icon: page.icon || "📄" })
                bundleWidgetRoot.saveItems(next)
            }
            bundleWidgetRoot.isModalOpen = false
        }
        onClosed: bundleWidgetRoot.isModalOpen = false
    }
}
