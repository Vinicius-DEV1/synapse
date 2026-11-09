import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: sidebarRoot
    Layout.preferredWidth: 300
    Layout.fillHeight: true
    color: "#161524" // bg-dark-card
    border.color: "#ffffff0f"
    border.width: 1

    property var pinnedPages: []
    property var pageTree: []
    property var collapsedNodeMap: ({})
    property string selectedPageId: ""

    signal pageSelected(string pageId)
    signal createRootRequested()
    signal createSubRequested(string parentId)
    signal togglePinRequested(string pageId)
    signal toggleCollapseRequested(string pageId)
    signal searchChanged(string query)

    function isNodeVisible(page) {
        if (!page) return false
        if (!page.depth || page.depth === 0) return true
        var pid = page.parent_id
        while (pid && pid !== "" && pid !== "null") {
            if (collapsedNodeMap[pid]) return false
            var found = false
            for (var i = 0; i < pageTree.length; ++i) {
                if (pageTree[i].id === pid) {
                    pid = pageTree[i].parent_id
                    found = true
                    break
                }
            }
            if (!found) break
        }
        return true
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 10

        // Header with live page count & + Nova Página button
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text {
                text: "Caderno • Notas"
                color: "#fffffe"
                font.pixelSize: 15
                font.bold: true
            }

            Item { Layout.fillWidth: true }

            // + Nova Página Button
            Rectangle {
                width: 28; height: 28; radius: 6
                color: "#6366f1"

                Text {
                    anchors.centerIn: parent
                    text: "+"
                    color: "#ffffff"
                    font.pixelSize: 18
                    font.bold: true
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: sidebarRoot.createRootRequested()
                }
            }
        }

        // Search Bar (⌘K)
        Rectangle {
            Layout.fillWidth: true
            height: 34
            radius: 8
            color: "#15141b"
            border.color: searchInput.activeFocus ? "#8b5cf680" : "#ffffff12"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 10
                anchors.rightMargin: 10
                spacing: 8

                Text { text: "🔍"; color: "#a7a9be"; font.pixelSize: 11 }

                TextInput {
                    id: searchInput
                    Layout.fillWidth: true
                    color: "#fffffe"
                    font.pixelSize: 12
                    selectByMouse: true
                    onTextChanged: sidebarRoot.searchChanged(text)

                    Text {
                        text: "Buscar páginas..."
                        color: "#64748b"
                        font.pixelSize: 12
                        visible: !searchInput.text && !searchInput.activeFocus
                    }
                }

                Rectangle {
                    width: 24; height: 18; radius: 4
                    color: "#00000033"
                    Text {
                        anchors.centerIn: parent
                        text: "⌘K"
                        color: "#ffffff40"
                        font.pixelSize: 9
                        font.family: "Monospace"
                    }
                }
            }
        }

        // Scrollable Page Tree with Pinned and Hierarchical Pages
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            contentWidth: width

            ColumnLayout {
                width: parent.width
                spacing: 12

                // ---------------------------------------------------
                // Section 1: Pinned Pages (📌 FIXADOS)
                // ---------------------------------------------------
                NotesPinnedSection {
                    pinnedPages: sidebarRoot.pinnedPages
                    selectedPageId: sidebarRoot.selectedPageId
                    onPageSelected: function(pageId) { sidebarRoot.pageSelected(pageId) }
                    onTogglePinRequested: function(pageId) { sidebarRoot.togglePinRequested(pageId) }
                }

                // Divider between Pinned and Pages
                Rectangle {
                    visible: sidebarRoot.pinnedPages.length > 0
                    Layout.fillWidth: true
                    height: 1
                    color: "#ffffff0a"
                }

                // ---------------------------------------------------
                // Section 2: Hierarchical Pages Tree (PÁGINAS)
                // ---------------------------------------------------
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Text {
                        text: "PÁGINAS"
                        color: "#64748b"
                        font.pixelSize: 11
                        font.bold: true
                        font.letterSpacing: 1.1
                    }

                    Repeater {
                        model: sidebarRoot.pageTree

                        delegate: Item {
                            id: treeItem
                            property bool isVisibleInTree: sidebarRoot.isNodeVisible(modelData)
                            property bool isCollapsed: sidebarRoot.collapsedNodeMap[modelData.id] === true
                            property bool isSelected: sidebarRoot.selectedPageId === modelData.id
                            property int depth: modelData.depth || 0

                            visible: isVisibleInTree
                            Layout.fillWidth: true
                            Layout.preferredHeight: isVisibleInTree ? 32 : 0

                            Rectangle {
                                anchors.left: parent.left
                                anchors.right: parent.right
                                anchors.top: parent.top
                                anchors.bottom: parent.bottom
                                anchors.leftMargin: treeItem.depth * 16
                                radius: 6
                                color: treeItem.isSelected ? "#8b5cf61a" : (treeMouse.containsMouse ? "#ffffff0a" : "transparent")
                                border.color: treeItem.isSelected ? "#8b5cf64d" : "transparent"
                                border.width: 1

                                RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 4
                                anchors.rightMargin: 6
                                spacing: 4

                                // Chevron toggle
                                Item {
                                    width: 18; height: 18
                                    Text {
                                        anchors.centerIn: parent
                                        text: treeItem.isCollapsed ? "▶" : "▼"
                                        font.pixelSize: 9
                                        color: "#64748b"
                                        visible: modelData.has_children === true
                                    }
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        enabled: modelData.has_children === true
                                        onClicked: sidebarRoot.toggleCollapseRequested(modelData.id)
                                    }
                                }

                                // Page Icon
                                Text {
                                    text: modelData.icon || "📄"
                                    font.pixelSize: 13
                                }

                                // Page Title
                                Text {
                                    Layout.fillWidth: true
                                    text: modelData.title || "Sem título"
                                    color: treeItem.isSelected ? "#c4b5fd" : (treeMouse.containsMouse ? "#fffffe" : "#a7a9be")
                                    font.pixelSize: 13
                                    font.bold: treeItem.isSelected
                                    elide: Text.ElideRight
                                }

                                // Hover Actions: [+] Criar subpágina | [📌] Fixar
                                RowLayout {
                                    spacing: 2
                                    visible: treeMouse.containsMouse

                                    // [+] Add Sub-page
                                    Rectangle {
                                        width: 18; height: 18; radius: 4; color: "#ffffff10"
                                        Text { anchors.centerIn: parent; text: "+"; color: "#a7a9be"; font.pixelSize: 13; font.bold: true }
                                        MouseArea {
                                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                            onClicked: sidebarRoot.createSubRequested(modelData.id)
                                        }
                                    }

                                    // [📌] Toggle Pin
                                    Rectangle {
                                        width: 18; height: 18; radius: 4; color: "#ffffff10"
                                        Text { anchors.centerIn: parent; text: "📌"; font.pixelSize: 9 }
                                        MouseArea {
                                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                            onClicked: sidebarRoot.togglePinRequested(modelData.id)
                                        }
                                    }
                                }
                            }

                            MouseArea {
                                id: treeMouse
                                anchors.fill: parent
                                z: -1
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: sidebarRoot.pageSelected(modelData.id)
                            }
                        }
                    }
                }
            }

            Item { height: 20 }
        }
    }
}
}
