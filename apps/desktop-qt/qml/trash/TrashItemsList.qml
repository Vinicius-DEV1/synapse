import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Item {
    id: listRoot
    Layout.fillWidth: true
    Layout.fillHeight: true

    property var items: []
    property int currentPage: 1
    property int pageSize: 50
    readonly property int totalPages: Math.max(1, Math.ceil((items ? items.length : 0) / pageSize))

    signal restoreRequested(string id, string itemType)
    signal deletePermanentlyRequested(string id, string itemType)

    function formatItemType(type) {
        if (type === "page") return { label: "Nota", icon: "📄", color: "#8b5cf6" }
        if (type === "anki_deck") return { label: "Baralho", icon: "🎴", color: "#6366f1" }
        if (type === "anki_card") return { label: "Cartão", icon: "🃏", color: "#38bdf8" }
        if (type === "book") return { label: "Livro", icon: "📚", color: "#10b981" }
        if (type === "vault") return { label: "Cofre", icon: "🔒", color: "#f59e0b" }
        if (type === "finance") return { label: "Transação", icon: "💰", color: "#ec4899" }
        if (type === "wishlist") return { label: "Wishlist", icon: "🎁", color: "#a855f7" }
        if (type === "calendar") return { label: "Agenda", icon: "📅", color: "#06b6d4" }
        if (type === "file") return { label: "Arquivo", icon: "📁", color: "#3b82f6" }
        if (type === "habit") return { label: "Hábito", icon: "✨", color: "#10b981" }
        if (type === "culture") return { label: "Cultura", icon: "🎬", color: "#f43f5e" }
        if (type === "lofi") return { label: "Lo-Fi", icon: "🎵", color: "#8b5cf6" }
        return { label: type, icon: "🗑️", color: "#a7a9be" }
    }

    ListView {
        id: trashListView
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: paginationBar.visible ? paginationBar.top : parent.bottom
        anchors.bottomMargin: paginationBar.visible ? 8 : 0
        clip: true
        model: {
            if (!listRoot.items) return []
            var start = (listRoot.currentPage - 1) * listRoot.pageSize
            return listRoot.items.slice(start, start + listRoot.pageSize)
        }
        spacing: 8

        delegate: Rectangle {
            id: rowDelegate
            width: trashListView.width
            height: 64
            radius: 10
            color: itemMouse.containsMouse ? "#201e30" : "#1a1924"
            border.color: itemMouse.containsMouse ? "#448b5cf6" : "#0fffffff"
            border.width: 1

            Behavior on color { ColorAnimation { duration: 120 } }
            Behavior on border.color { ColorAnimation { duration: 120 } }

            property var meta: listRoot.formatItemType(modelData.item_type)

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
                    color: rstMouse.containsMouse ? "#3310b981" : "#1a10b981"
                    border.color: "#5510b981"

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
                        onClicked: listRoot.restoreRequested(modelData.id, modelData.item_type)
                    }
                }

                // Hard Delete Action Button
                Rectangle {
                    width: 32
                    height: 32
                    radius: 7
                    color: delMouse.containsMouse ? "#33f43f5e" : "transparent"
                    border.color: delMouse.containsMouse ? "#66f43f5e" : "transparent"

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
                        onClicked: listRoot.deletePermanentlyRequested(modelData.id, modelData.item_type)
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
            visible: listRoot.items.length === 0
            text: "A lixeira está vazia. Nenhum item excluído."
            color: "#64748b"
            font.pixelSize: 14
        }
    }

    // Pagination Footer
    RowLayout {
        id: paginationBar
        anchors.bottom: parent.bottom
        anchors.horizontalCenter: parent.horizontalCenter
        height: 36
        visible: listRoot.items && listRoot.items.length > listRoot.pageSize
        spacing: 12

        Button {
            id: prevBtn
            text: "◀ Anterior"
            enabled: listRoot.currentPage > 1
            onClicked: listRoot.currentPage -= 1
            background: Rectangle { color: prevBtn.enabled ? "#242335" : "#171624"; radius: 6 }
            contentItem: Text { text: prevBtn.text; color: prevBtn.enabled ? "#ffffff" : "#64748b"; font.pixelSize: 11; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        Text {
            text: "Página " + listRoot.currentPage + " de " + listRoot.totalPages + " (" + listRoot.items.length + " itens)"
            color: "#a7a9be"
            font.pixelSize: 12
        }

        Button {
            id: nextBtn
            text: "Próxima ▶"
            enabled: listRoot.currentPage < listRoot.totalPages
            onClicked: listRoot.currentPage += 1
            background: Rectangle { color: nextBtn.enabled ? "#242335" : "#171624"; radius: 6 }
            contentItem: Text { text: nextBtn.text; color: nextBtn.enabled ? "#ffffff" : "#64748b"; font.pixelSize: 11; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }
    }
}
