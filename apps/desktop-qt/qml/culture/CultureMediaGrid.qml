import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

ColumnLayout {
    id: mediaGridRoot
    spacing: 16

    property var filteredItems: []
    property string activeTypeFilter: "all"
    property string activeStatusFilter: "all"
    property string displayMode: "grid" // "grid" | "compact" | "list"
    property var typeOrder: ["anime", "série", "filme"]

    readonly property var goalItems: {
        if (!filteredItems || filteredItems.length === 0) return []
        return filteredItems.filter(function(it) {
            return it.goal_note && String(it.goal_note).trim().length > 0
        })
    }

    function moveTypeOrder(typeKey, delta) {
        var idx = typeOrder.indexOf(typeKey)
        var target = idx + delta
        if (idx < 0 || target < 0 || target >= typeOrder.length) return
        var next = typeOrder.slice()
        var tmp = next[idx]
        next[idx] = next[target]
        next[target] = tmp
        typeOrder = next
        if (typeof dataController !== "undefined" && dataController) {
            dataController.setConfig("culture_type_order", JSON.stringify(next))
        }
    }

    Component.onCompleted: {
        if (typeof dataController !== "undefined" && dataController) {
            try {
                var rawOrder = dataController.getConfig("culture_type_order", "")
                if (rawOrder && rawOrder.length > 2) {
                    var parsed = JSON.parse(rawOrder)
                    if (Array.isArray(parsed) && parsed.length > 0) typeOrder = parsed
                }
            } catch (e) {}
        }
    }

    readonly property var orderedFilteredItems: {
        if (!filteredItems || filteredItems.length === 0 || activeTypeFilter !== "all") return filteredItems
        var orderMap = ({})
        for (var k = 0; k < typeOrder.length; k++) orderMap[typeOrder[k]] = k
        return filteredItems.slice().sort(function(a, b) {
            var ia = orderMap.hasOwnProperty(a.type) ? orderMap[a.type] : 99
            var ib = orderMap.hasOwnProperty(b.type) ? orderMap[b.type] : 99
            return ia - ib
        })
    }

    signal typeFilterChanged(string filter)
    signal statusFilterChanged(string filter)
    signal itemSelected(var item)
    signal progressUpdated(string itemId, int newProgress)
    signal itemIncremented(string itemId)
    signal itemDeleted(string itemId)

    // Secondary Bar: Filter Pills (Types & Status)
    Flickable {
        Layout.fillWidth: true
        Layout.preferredHeight: 34
        contentWidth: filterPillsLayout.implicitWidth
        clip: true
        flickableDirection: Flickable.HorizontalFlick
        boundsBehavior: Flickable.StopAtBounds

        RowLayout {
            id: filterPillsLayout
            height: 34
            spacing: 16

            // Type Pills
            RowLayout {
                spacing: 6

                Repeater {
                    model: [
                        { key: "all", label: "Todas as Mídias" },
                        { key: "anime", label: "⛩️ Animes" },
                        { key: "série", label: "📺 Séries" },
                        { key: "filme", label: "🎬 Filmes" }
                    ]

                    delegate: Rectangle {
                        width: typePillText.contentWidth + 18
                        height: 32
                        radius: 8
                        color: mediaGridRoot.activeTypeFilter === modelData.key ? "#268b5cf6" : "#1a1924"
                        border.color: mediaGridRoot.activeTypeFilter === modelData.key ? "#668b5cf6" : "#0fffffff"

                        Text {
                            id: typePillText
                            anchors.centerIn: parent
                            text: modelData.label
                            color: mediaGridRoot.activeTypeFilter === modelData.key ? "#c4b5fd" : "#a7a9be"
                            font.pixelSize: 12
                            font.bold: mediaGridRoot.activeTypeFilter === modelData.key
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: mediaGridRoot.typeFilterChanged(modelData.key)
                        }
                    }
                }
            }

            Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 20; color: "#15ffffff" }

            // Status Pills
            RowLayout {
                spacing: 6

                Repeater {
                    model: [
                        { key: "all", label: "Todos os Status" },
                        { key: "watching", label: "Assistindo" },
                        { key: "backlog", label: "Quero Ver" },
                        { key: "finished", label: "Concluído" }
                    ]

                    delegate: Rectangle {
                        width: statusPillText.contentWidth + 18
                        height: 32
                        radius: 8
                        color: mediaGridRoot.activeStatusFilter === modelData.key ? "#268b5cf6" : "#1a1924"
                        border.color: mediaGridRoot.activeStatusFilter === modelData.key ? "#668b5cf6" : "#0fffffff"

                        Text {
                            id: statusPillText
                            anchors.centerIn: parent
                            text: modelData.label
                            color: mediaGridRoot.activeStatusFilter === modelData.key ? "#c4b5fd" : "#a7a9be"
                            font.pixelSize: 12
                            font.bold: mediaGridRoot.activeStatusFilter === modelData.key
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: mediaGridRoot.statusFilterChanged(modelData.key)
                        }
                    }
                }
            }

            Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 20; color: "#15ffffff" }

            // Display Mode Switcher (Grid | Compact | List)
            RowLayout {
                spacing: 4
                Repeater {
                    model: [
                        { key: "grid", label: "Grade" },
                        { key: "compact", label: "Compacto" },
                        { key: "list", label: "Lista" }
                    ]
                    delegate: Rectangle {
                        required property var modelData
                        width: modeLabel.contentWidth + 16
                        height: 32
                        radius: 8
                        color: mediaGridRoot.displayMode === modelData.key ? "#268b5cf6" : "#1a1924"
                        border.color: mediaGridRoot.displayMode === modelData.key ? "#668b5cf6" : "#0fffffff"
                        Text {
                            id: modeLabel
                            anchors.centerIn: parent
                            text: modelData.label
                            color: mediaGridRoot.displayMode === modelData.key ? "#c4b5fd" : "#a7a9be"
                            font.pixelSize: 11
                            font.bold: mediaGridRoot.displayMode === modelData.key
                        }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: mediaGridRoot.displayMode = modelData.key
                        }
                    }
                }
            }
        }
    }

    // Active Personal Goals & Category Reordering Bar
    RowLayout {
        Layout.fillWidth: true
        spacing: 12
        visible: mediaGridRoot.goalItems.length > 0 || mediaGridRoot.activeTypeFilter === "all"

        Rectangle {
            visible: mediaGridRoot.goalItems.length > 0
            Layout.fillWidth: true
            Layout.preferredHeight: 34
            radius: 8
            color: "#151422"
            border.color: "#22f59e0b"
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 10
                anchors.rightMargin: 10
                spacing: 8
                Text { text: "🎯 Objetivos Ativos (" + mediaGridRoot.goalItems.length + "):"; color: "#fbbf24"; font.pixelSize: 11; font.bold: true }
                Text {
                    Layout.fillWidth: true
                    text: mediaGridRoot.goalItems.slice(0, 3).map(function(g) { return g.title + " — " + g.goal_note }).join("   •   ")
                    color: "#cbd5e1"
                    font.pixelSize: 11
                    elide: Text.ElideRight
                }
            }
        }

        RowLayout {
            visible: mediaGridRoot.activeTypeFilter === "all"
            spacing: 4
            Text { text: "Ordem:"; color: "#64748b"; font.pixelSize: 10 }
            Repeater {
                model: mediaGridRoot.typeOrder
                delegate: Rectangle {
                    required property string modelData
                    required property int index
                    width: ordRow.implicitWidth + 12
                    height: 28
                    radius: 6
                    color: "#1a1924"
                    border.color: "#14ffffff"
                    RowLayout {
                        id: ordRow
                        anchors.centerIn: parent
                        spacing: 4
                        Text { text: modelData; color: "#c4b5fd"; font.pixelSize: 10; font.bold: true }
                        Text {
                            visible: index > 0
                            text: "←"
                            color: "#94a1b2"
                            font.pixelSize: 10
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: mediaGridRoot.moveTypeOrder(modelData, -1)
                            }
                        }
                        Text {
                            visible: index < mediaGridRoot.typeOrder.length - 1
                            text: "→"
                            color: "#94a1b2"
                            font.pixelSize: 10
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: mediaGridRoot.moveTypeOrder(modelData, 1)
                            }
                        }
                    }
                }
            }
        }
    }

    // Grid / Compact / List View of Culture Items
    GridView {
        id: cultureGridView
        Layout.fillWidth: true
        Layout.fillHeight: true
        clip: true
        readonly property int columnCount: mediaGridRoot.displayMode === "list" ? 1 : (mediaGridRoot.displayMode === "compact" ? Math.max(1, Math.floor(width / 230)) : Math.max(1, Math.floor(width / 310)))
        cellWidth: Math.floor(width / columnCount)
        cellHeight: mediaGridRoot.displayMode === "list" ? 86 : (mediaGridRoot.displayMode === "compact" ? 124 : 170)
        model: mediaGridRoot.orderedFilteredItems

        delegate: Rectangle {
            id: cultureCardDelegate
            width: cultureGridView.cellWidth - 16
            height: cultureGridView.cellHeight - 14
            x: 8
            radius: 12
            color: cardMouse.containsMouse ? "#211f30" : "#1a1924"
            border.color: cardMouse.containsMouse ? "#668b5cf6" : "#0fffffff"
            border.width: 1

            Behavior on color { ColorAnimation { duration: 150 } }
            Behavior on border.color { ColorAnimation { duration: 150 } }

            RowLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 12

                // Cover image / poster
                Rectangle {
                    Layout.preferredWidth: mediaGridRoot.displayMode === "list" ? 46 : (mediaGridRoot.displayMode === "compact" ? 64 : 84)
                    Layout.fillHeight: true
                    radius: 8
                    color: "#15141b"
                    clip: true

                    Image {
                        anchors.fill: parent
                        source: modelData.cover_image || ""
                        fillMode: Image.PreserveAspectCrop
                        visible: status === Image.Ready
                    }

                    ColumnLayout {
                        anchors.centerIn: parent
                        visible: !modelData.cover_image || cultureImgStatus.status !== Image.Ready
                        spacing: 4
                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: modelData.type === "filme" ? "🎬" : (modelData.type === "anime" ? "⛩️" : "📺")
                            font.pixelSize: 26
                        }
                    }

                    Image {
                        id: cultureImgStatus
                        visible: false
                        source: modelData.cover_image || ""
                    }
                }

                // Metadata & Action Controls
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    spacing: 4

                    // Title & Type Badge
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 6

                        Text {
                            Layout.fillWidth: true
                            text: modelData.title
                            color: cardMouse.containsMouse ? "#c4b5fd" : "#fffffe"
                            font.pixelSize: 14
                            font.bold: true
                            elide: Text.ElideRight
                        }

                        Rectangle {
                            Layout.preferredWidth: typeText.contentWidth + 8
                            Layout.preferredHeight: 18
                            radius: 4
                            color: "#1a8b5cf6"

                            Text {
                                id: typeText
                                anchors.centerIn: parent
                                text: modelData.type || "Mídia"
                                color: "#a78bfa"
                                font.pixelSize: 10
                                font.bold: true
                            }
                        }
                    }

                    // Synopsis preview
                    Text {
                        visible: mediaGridRoot.displayMode === "grid"
                        Layout.fillWidth: true
                        text: modelData.synopsis || "Sem sinopse disponível."
                        color: "#a7a9be"
                        font.pixelSize: 11
                        wrapMode: Text.WordWrap
                        maximumLineCount: 2
                        elide: Text.ElideRight
                    }

                    Item { Layout.fillHeight: true }

                    // Progress bar preview
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 4
                        radius: 2
                        color: "#15141b"
                        Rectangle {
                            width: parent.width * (modelData.total_episodes > 0 ? Math.min(1.0, (modelData.progress || 0) / modelData.total_episodes) : 0.05)
                            height: parent.height
                            radius: 2
                            color: (modelData.progress >= modelData.total_episodes && modelData.total_episodes > 0) ? "#10b981" : "#8b5cf6"
                        }
                    }

                    // Bottom Actions: Stepper and Delete
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Text {
                            text: "Ep. " + (modelData.progress || 0) + (modelData.total_episodes ? "/" + modelData.total_episodes : "")
                            color: "#fffffe"
                            font.pixelSize: 12
                            font.bold: true
                        }

                        Item { Layout.fillWidth: true }

                        // -1 Ep Stepper
                        Rectangle {
                            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 6
                            color: "#262438"; border.color: "#12ffffff"
                            Text { anchors.centerIn: parent; text: "-1"; color: "#fffffe"; font.pixelSize: 10; font.bold: true }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    var nextP = Math.max(0, (modelData.progress || 0) - 1)
                                    mediaGridRoot.progressUpdated(modelData.id, nextP)
                                }
                            }
                        }

                        // +1 Ep Stepper
                        Rectangle {
                            Layout.preferredWidth: 44; Layout.preferredHeight: 26; radius: 6
                            color: "#268b5cf6"; border.color: "#668b5cf6"
                            Text { anchors.centerIn: parent; text: "+1 Ep"; color: "#c4b5fd"; font.pixelSize: 10; font.bold: true }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: mediaGridRoot.itemIncremented(modelData.id)
                            }
                        }

                        // Delete Button
                        Rectangle {
                            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 6
                            color: delCultureMouse.containsMouse ? "#26f43f5e" : "transparent"
                            border.color: delCultureMouse.containsMouse ? "#55f43f5e" : "transparent"
                            AppIcon {
                                anchors.centerIn: parent
                                width: 13
                                height: 13
                                name: "trash"
                                color: delCultureMouse.containsMouse ? "#f43f5e" : "#71717a"
                            }
                            MouseArea {
                                id: delCultureMouse
                                anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                                onClicked: mediaGridRoot.itemDeleted(modelData.id)
                            }
                        }
                    }
                }
            }

            MouseArea {
                id: cardMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                z: -1
                onClicked: mediaGridRoot.itemSelected(modelData)
            }
        }

        Text {
            anchors.centerIn: parent
            visible: mediaGridRoot.filteredItems.length === 0
            text: "Nenhuma obra cadastrada nesta categoria ou filtro."
            color: "#64748b"
            font.pixelSize: 15
        }
    }
}
