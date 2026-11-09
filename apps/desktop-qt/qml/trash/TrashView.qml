import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: trashRoot
    color: "#0f0e17" // bg-dark-bg

    property var allTrashItems: []
    property var filteredTrashItems: []
    property string activeTypeFilter: "all"
    property string searchQuery: ""
    property bool showEmptyConfirm: false

    function refreshTrash() {
        allTrashItems = dataController.getTrashItems()
        applyFilters()
    }

    function applyFilters() {
        var q = searchQuery.trim().toLowerCase()
        var res = []
        for (var i = 0; i < allTrashItems.length; i++) {
            var it = allTrashItems[i]
            var matchType = true
            if (activeTypeFilter !== "all") {
                matchType = (it.item_type === activeTypeFilter)
            }
            var matchSearch = true
            if (q.length > 0) {
                var title = (it.title || "").toLowerCase()
                matchSearch = (title.indexOf(q) !== -1)
            }
            if (matchType && matchSearch) {
                res.push(it)
            }
        }
        filteredTrashItems = res
    }

    function formatItemType(type) {
        if (type === "page") return { label: "Nota", icon: "📄", color: "#8b5cf6" }
        if (type === "anki_deck") return { label: "Baralho", icon: "🎴", color: "#6366f1" }
        if (type === "anki_card") return { label: "Cartão", icon: "🃏", color: "#38bdf8" }
        if (type === "book") return { label: "Livro", icon: "📚", color: "#10b981" }
        if (type === "vault") return { label: "Cofre", icon: "🔒", color: "#f59e0b" }
        if (type === "finance") return { label: "Transação", icon: "💰", color: "#ec4899" }
        if (type === "wishlist") return { label: "Wishlist", icon: "🎁", color: "#a855f7" }
        if (type === "calendar") return { label: "Agenda", icon: "📅", color: "#06b6d4" }
        return { label: type, icon: "🗑️", color: "#a7a9be" }
    }

    Component.onCompleted: {
        refreshTrash()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 20

        // Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 16

            ColumnLayout {
                spacing: 4
                Text {
                    text: "🗑️ Lixeira do Sistema"
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
                Text {
                    text: trashRoot.allTrashItems.length + " item(ns) na lixeira • Itens excluídos podem ser restaurados ou apagados permanentemente."
                    color: "#a7a9be"
                    font.pixelSize: 13
                }
            }

            Item { Layout.fillWidth: true }

            // Empty Trash Button
            Rectangle {
                width: 140
                height: 38
                radius: 10
                color: emptyMouse.containsMouse ? "#e11d48" : "#f43f5e"
                visible: trashRoot.allTrashItems.length > 0

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "💥"; font.pixelSize: 12 }
                    Text { text: "Esvaziar Lixeira"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                }

                MouseArea {
                    id: emptyMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: trashRoot.showEmptyConfirm = true
                }
            }
        }

        // Filter Tabs & Search Bar Row
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            // Filter Tabs
            Rectangle {
                height: 38
                radius: 10
                color: "#15141b"
                border.color: "#ffffff12"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 4
                    spacing: 4

                    Repeater {
                        model: [
                            { key: "all", label: "Todos" },
                            { key: "page", label: "Notas" },
                            { key: "anki_deck", label: "Baralhos" },
                            { key: "book", label: "Livros" },
                            { key: "vault", label: "Cofre" },
                            { key: "finance", label: "Finanças" }
                        ]
                        Rectangle {
                            height: 30
                            radius: 6
                            color: trashRoot.activeTypeFilter === modelData.key ? "#262438" : "transparent"
                            Layout.preferredWidth: tabText.contentWidth + 16
                            Text {
                                id: tabText
                                anchors.centerIn: parent
                                text: modelData.label
                                color: trashRoot.activeTypeFilter === modelData.key ? "#fffffe" : "#a7a9be"
                                font.pixelSize: 12
                                font.bold: trashRoot.activeTypeFilter === modelData.key
                            }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    trashRoot.activeTypeFilter = modelData.key
                                    trashRoot.applyFilters()
                                }
                            }
                        }
                    }
                }
            }

            Item { Layout.fillWidth: true }

            // Search Bar
            Rectangle {
                width: 220
                height: 38
                radius: 10
                color: "#15141b"
                border.color: searchInput.activeFocus ? "#8b5cf680" : "#ffffff12"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 10
                    anchors.rightMargin: 10
                    spacing: 8

                    Text { text: "🔍"; font.pixelSize: 11; color: "#a7a9be" }

                    TextInput {
                        id: searchInput
                        Layout.fillWidth: true
                        color: "#ffffff"
                        font.pixelSize: 12
                        selectByMouse: true
                        onTextChanged: {
                            trashRoot.searchQuery = text
                            trashRoot.applyFilters()
                        }
                        Text {
                            text: "Buscar na lixeira..."
                            color: "#64748b"
                            font.pixelSize: 12
                            visible: !searchInput.text && !searchInput.activeFocus
                        }
                    }
                }
            }
        }

        // Trash Items ListView
        ListView {
            id: trashListView
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            model: trashRoot.filteredTrashItems
            spacing: 8

            delegate: Rectangle {
                id: rowDelegate
                width: trashListView.width
                height: 64
                radius: 10
                color: itemMouse.containsMouse ? "#201e30" : "#1a1924"
                border.color: itemMouse.containsMouse ? "#8b5cf644" : "#ffffff0f"
                border.width: 1

                Behavior on color { ColorAnimation { duration: 120 } }
                Behavior on border.color { ColorAnimation { duration: 120 } }

                property var meta: trashRoot.formatItemType(modelData.item_type)

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: 14

                    // Type Badge
                    Rectangle {
                        height: 26
                        radius: 6
                        color: rowDelegate.meta.color + "22"
                        border.color: rowDelegate.meta.color + "55"
                        Layout.preferredWidth: typeRow.width + 12
                        RowLayout {
                            id: typeRow
                            anchors.centerIn: parent
                            spacing: 4
                            Text { text: rowDelegate.meta.icon; font.pixelSize: 11 }
                            Text {
                                text: rowDelegate.meta.label
                                color: rowDelegate.meta.color
                                font.pixelSize: 11
                                font.bold: true
                            }
                        }
                    }

                    // Title
                    Text {
                        text: modelData.title || "Sem título"
                        color: "#fffffe"
                        font.pixelSize: 14
                        font.bold: true
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }

                    // Deletion Date
                    Text {
                        text: modelData.deleted_at ? Qt.formatDateTime(new Date(modelData.deleted_at), "dd/MM/yyyy às hh:mm") : "Excluído recentemente"
                        color: "#64748b"
                        font.pixelSize: 11
                    }

                    // Restore Action Button
                    Rectangle {
                        width: 90
                        height: 32
                        radius: 7
                        color: rstMouse.containsMouse ? "#10b98133" : "#10b9811a"
                        border.color: "#10b98155"

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 4
                            Text { text: "↩"; color: "#34d399"; font.pixelSize: 12; font.bold: true }
                            Text { text: "Restaurar"; color: "#34d399"; font.pixelSize: 11; font.bold: true }
                        }

                        MouseArea {
                            id: rstMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                dataController.restoreTrashItem(modelData.id, modelData.item_type)
                                trashRoot.refreshTrash()
                            }
                        }
                    }

                    // Hard Delete Action Button
                    Rectangle {
                        width: 32
                        height: 32
                        radius: 7
                        color: delMouse.containsMouse ? "#f43f5e33" : "transparent"
                        border.color: delMouse.containsMouse ? "#f43f5e66" : "transparent"

                        Text {
                            anchors.centerIn: parent
                            text: "🗑️"
                            font.pixelSize: 12
                        }

                        MouseArea {
                            id: delMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                dataController.deleteTrashItemPermanently(modelData.id, modelData.item_type)
                                trashRoot.refreshTrash()
                            }
                        }
                    }
                }

                MouseArea {
                    id: itemMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    z: -1
                }
            }

            // Empty State
            Text {
                anchors.centerIn: parent
                visible: trashRoot.filteredTrashItems.length === 0
                text: "A lixeira está vazia. Nenhum item excluído."
                color: "#64748b"
                font.pixelSize: 14
            }
        }
    }

    // Modal de Confirmação: Esvaziar Lixeira
    Rectangle {
        anchors.fill: parent
        color: "#00000088"
        visible: trashRoot.showEmptyConfirm
        z: 99

        MouseArea {
            anchors.fill: parent
            onClicked: trashRoot.showEmptyConfirm = false
        }

        Rectangle {
            anchors.centerIn: parent
            width: 440
            height: 200
            radius: 16
            color: "#161524"
            border.color: "#f43f5e55"
            border.width: 1

            MouseArea { anchors.fill: parent } // Prevent click-through

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 24
                spacing: 16

                Text {
                    text: "Esvaziar Lixeira Permanentemente?"
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                }

                Text {
                    text: "Todos os itens da lixeira serão eliminados definitivamente do banco de dados SQLite. Esta ação não poderá ser desfeita."
                    color: "#a7a9be"
                    font.pixelSize: 13
                    wrapMode: Text.Wrap
                    Layout.fillWidth: true
                }

                Item { Layout.fillHeight: true }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Item { Layout.fillWidth: true }

                    Rectangle {
                        width: 90; height: 36; radius: 8; color: "#211f30"
                        Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: trashRoot.showEmptyConfirm = false
                        }
                    }

                    Rectangle {
                        width: 130; height: 36; radius: 8; color: "#f43f5e"
                        Text { anchors.centerIn: parent; text: "Sim, Esvaziar"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                dataController.emptyTrash()
                                trashRoot.showEmptyConfirm = false
                                trashRoot.refreshTrash()
                            }
                        }
                    }
                }
            }
        }
    }
}

