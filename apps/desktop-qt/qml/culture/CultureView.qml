import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: cultureRoot
    color: "#0f0e17" // bg-dark-bg

    property var allItems: []
    property var filteredItems: []
    property string activeTypeFilter: "all" // "all", "anime", "série", "filme"
    property string activeStatusFilter: "all" // "all", "watching", "backlog", "finished"
    property string searchQuery: ""
    property bool isCreatingItem: false
    property string selectedType: "anime"
    property var selectedItemForDetails: null

    function refreshItems() {
        allItems = dataController.getCultureItems("")
        applyFilters()
    }

    function applyFilters() {
        var query = searchQuery.trim().toLowerCase()
        var result = []
        for (var i = 0; i < allItems.length; i++) {
            var it = allItems[i]
            var matchType = true
            if (activeTypeFilter !== "all") {
                matchType = (it.type === activeTypeFilter)
            }

            var matchStatus = true
            if (activeStatusFilter !== "all") {
                if (activeStatusFilter === "watching") matchStatus = (it.status === "watching" || it.status === "in_progress")
                else if (activeStatusFilter === "backlog") matchStatus = (it.status === "backlog" || it.status === "planned")
                else if (activeStatusFilter === "finished") matchStatus = (it.status === "finished" || it.status === "completed")
            }

            var matchSearch = true
            if (query.length > 0) {
                var title = (it.title || "").toLowerCase()
                var syn = (it.synopsis || "").toLowerCase()
                matchSearch = (title.indexOf(query) !== -1 || syn.indexOf(query) !== -1)
            }

            if (matchType && matchStatus && matchSearch) {
                result.push(it)
            }
        }
        filteredItems = result
    }

    Component.onCompleted: {
        refreshItems()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        // Header and Search / Action Row
        RowLayout {
            Layout.fillWidth: true
            spacing: 16

            ColumnLayout {
                spacing: 4
                Text {
                    text: "🎭 Cultura & Entretenimento"
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
                Text {
                    text: cultureRoot.filteredItems.length + " obra(s) listada(s) de " + cultureRoot.allItems.length + " catalogadas (animes, séries, filmes)"
                    color: "#a7a9be"
                    font.pixelSize: 13
                }
            }

            Item { Layout.fillWidth: true }

            // Search Bar
            Rectangle {
                Layout.preferredWidth: 240
                height: 40
                radius: 10
                color: "#15141b"
                border.color: cultureSearchInput.activeFocus ? "#8b5cf680" : "#ffffff12"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 12
                    anchors.rightMargin: 12
                    spacing: 8

                    Text { text: "🔍"; color: "#a7a9be"; font.pixelSize: 12 }

                    TextInput {
                        id: cultureSearchInput
                        Layout.fillWidth: true
                        color: "#fffffe"
                        font.pixelSize: 13
                        selectByMouse: true
                        onTextChanged: {
                            cultureRoot.searchQuery = text
                            cultureRoot.applyFilters()
                        }

                        Text {
                            text: "Buscar por título..."
                            color: "#64748b"
                            font.pixelSize: 13
                            visible: !cultureSearchInput.text && !cultureSearchInput.activeFocus
                        }
                    }
                }
            }

            // "+ Adicionar Obra" Button
            Rectangle {
                width: 144
                height: 40
                radius: 10
                color: "#8b5cf6" // violet-600

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Adicionar Obra"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    hoverEnabled: true
                    onEntered: parent.color = "#7c3aed"
                    onExited: parent.color = "#8b5cf6"
                    onClicked: {
                        newCultureTitle.text = ""
                        newCultureSynopsis.text = ""
                        newCultureEpisodes.text = "12"
                        newCultureCover.text = ""
                        cultureRoot.selectedType = "anime"
                        cultureRoot.isCreatingItem = true
                    }
                }
            }
        }

        // Secondary Bar: Filter Pills (Types & Status)
        RowLayout {
            Layout.fillWidth: true
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
                        color: cultureRoot.activeTypeFilter === modelData.key ? "#8b5cf626" : "#1a1924"
                        border.color: cultureRoot.activeTypeFilter === modelData.key ? "#8b5cf666" : "#ffffff0f"

                        Text {
                            id: typePillText
                            anchors.centerIn: parent
                            text: modelData.label
                            color: cultureRoot.activeTypeFilter === modelData.key ? "#c4b5fd" : "#a7a9be"
                            font.pixelSize: 12
                            font.bold: cultureRoot.activeTypeFilter === modelData.key
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                cultureRoot.activeTypeFilter = modelData.key
                                cultureRoot.applyFilters()
                            }
                        }
                    }
                }
            }

            Rectangle { width: 1; height: 20; color: "#ffffff15" }

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
                        color: cultureRoot.activeStatusFilter === modelData.key ? "#8b5cf626" : "#1a1924"
                        border.color: cultureRoot.activeStatusFilter === modelData.key ? "#8b5cf666" : "#ffffff0f"

                        Text {
                            id: statusPillText
                            anchors.centerIn: parent
                            text: modelData.label
                            color: cultureRoot.activeStatusFilter === modelData.key ? "#c4b5fd" : "#a7a9be"
                            font.pixelSize: 12
                            font.bold: cultureRoot.activeStatusFilter === modelData.key
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                cultureRoot.activeStatusFilter = modelData.key
                                cultureRoot.applyFilters()
                            }
                        }
                    }
                }
            }
        }

        // Grid View of Culture Items
        GridView {
            id: cultureGridView
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            cellWidth: 360
            cellHeight: 170
            model: cultureRoot.filteredItems

            delegate: Rectangle {
                id: cultureCardDelegate
                width: 340
                height: 154
                radius: 12
                color: cardMouse.containsMouse ? "#211f30" : "#1a1924" // bg-dark-card
                border.color: cardMouse.containsMouse ? "#8b5cf666" : "#ffffff0f"
                border.width: 1

                Behavior on color { ColorAnimation { duration: 150 } }
                Behavior on border.color { ColorAnimation { duration: 150 } }

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 12

                    // Cover image / poster
                    Rectangle {
                        Layout.preferredWidth: 84
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
                                width: typeText.contentWidth + 8
                                height: 18
                                radius: 4
                                color: "#8b5cf61a"

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
                            height: 4
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
                                width: 28; height: 26; radius: 6
                                color: "#262438"; border.color: "#ffffff12"
                                Text { anchors.centerIn: parent; text: "-1"; color: "#fffffe"; font.pixelSize: 10; font.bold: true }
                                MouseArea {
                                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        var nextP = Math.max(0, (modelData.progress || 0) - 1)
                                        dataController.updateCultureProgress(modelData.id, nextP)
                                        cultureRoot.refreshItems()
                                    }
                                }
                            }

                            // +1 Ep Stepper
                            Rectangle {
                                width: 44; height: 26; radius: 6
                                color: "#8b5cf626"; border.color: "#8b5cf666"
                                Text { anchors.centerIn: parent; text: "+1 Ep"; color: "#c4b5fd"; font.pixelSize: 10; font.bold: true }
                                MouseArea {
                                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        dataController.incrementCultureProgress(modelData.id)
                                        cultureRoot.refreshItems()
                                    }
                                }
                            }

                            // Delete Button
                            Rectangle {
                                width: 28; height: 26; radius: 6
                                color: delCultureMouse.containsMouse ? "#f43f5e26" : "transparent"
                                border.color: delCultureMouse.containsMouse ? "#f43f5e55" : "transparent"
                                Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }
                                MouseArea {
                                    id: delCultureMouse
                                    anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        dataController.deleteCultureItem(modelData.id)
                                        cultureRoot.refreshItems()
                                    }
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
                    onClicked: cultureRoot.selectedItemForDetails = modelData
                }
            }

            Text {
                anchors.centerIn: parent
                visible: cultureRoot.filteredItems.length === 0
                text: "Nenhuma obra cadastrada nesta categoria ou filtro."
                color: "#64748b"
                font.pixelSize: 15
            }
        }
    }

    // ===================================================================
    // Modal: Adicionar Obra
    // ===================================================================
    Rectangle {
        anchors.fill: parent
        color: "#00000088"
        visible: cultureRoot.isCreatingItem
        z: 95

        MouseArea {
            anchors.fill: parent
            onClicked: cultureRoot.isCreatingItem = false
        }

        Rectangle {
            anchors.centerIn: parent
            width: 460
            height: 480
            radius: 16
            color: "#161524"
            border.color: "#ffffff14"
            border.width: 1

            MouseArea {
                anchors.fill: parent
            }

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 28
                spacing: 14

                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "🎭 Adicionar Nova Obra Cultural"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: cultureRoot.isCreatingItem = false
                        }
                    }
                }

                // Title Input
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { text: "Título da Obra"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true
                        height: 38
                        radius: 8
                        color: "#15141b"
                        border.color: newCultureTitle.activeFocus ? "#8b5cf6" : "#ffffff15"
                        TextInput {
                            id: newCultureTitle
                            anchors.fill: parent
                            anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: 13
                            selectByMouse: true
                        }
                    }
                }

                // Type Selector
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { text: "Tipo de Mídia"; color: "#a7a9be"; font.pixelSize: 12 }
                    RowLayout {
                        spacing: 8
                        Repeater {
                            model: [
                                { key: "anime", label: "⛩️ Anime" },
                                { key: "série", label: "📺 Série" },
                                { key: "filme", label: "🎬 Filme" }
                            ]
                            delegate: Rectangle {
                                width: 100; height: 34; radius: 8
                                color: cultureRoot.selectedType === modelData.key ? "#8b5cf6" : "#211f30"
                                Text {
                                    anchors.centerIn: parent
                                    text: modelData.label
                                    color: cultureRoot.selectedType === modelData.key ? "#ffffff" : "#a7a9be"
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: cultureRoot.selectedType = modelData.key
                                }
                            }
                        }
                    }
                }

                // Total Episodes Input
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { text: "Total de Episódios / Capítulos"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true
                        height: 38
                        radius: 8
                        color: "#15141b"
                        border.color: newCultureEpisodes.activeFocus ? "#8b5cf6" : "#ffffff15"
                        TextInput {
                            id: newCultureEpisodes
                            anchors.fill: parent
                            anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: 13
                            selectByMouse: true
                            text: "12"
                        }
                    }
                }

                // Cover URL Input
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { text: "URL do Pôster / Capa (opcional)"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true
                        height: 38
                        radius: 8
                        color: "#15141b"
                        border.color: newCultureCover.activeFocus ? "#8b5cf6" : "#ffffff15"
                        TextInput {
                            id: newCultureCover
                            anchors.fill: parent
                            anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: 13
                            selectByMouse: true
                        }
                    }
                }

                // Synopsis Input
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { text: "Sinopse (opcional)"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true
                        height: 52
                        radius: 8
                        color: "#15141b"
                        border.color: newCultureSynopsis.activeFocus ? "#8b5cf6" : "#ffffff15"
                        TextInput {
                            id: newCultureSynopsis
                            anchors.fill: parent
                            anchors.margins: 8
                            color: "#fffffe"
                            font.pixelSize: 12
                            selectByMouse: true
                        }
                    }
                }

                Item { Layout.fillHeight: true }

                // Actions Footer
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Item { Layout.fillWidth: true }
                    Rectangle {
                        width: 90; height: 38; radius: 8; color: "#211f30"
                        Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: cultureRoot.isCreatingItem = false
                        }
                    }
                    Rectangle {
                        width: 130; height: 38; radius: 8; color: "#8b5cf6"
                        Text { anchors.centerIn: parent; text: "Adicionar Obra"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                if (newCultureTitle.text.trim().length > 0) {
                                    var eps = parseInt(newCultureEpisodes.text) || 12
                                    dataController.createCultureItem(newCultureTitle.text, cultureRoot.selectedType, newCultureSynopsis.text, eps, newCultureCover.text)
                                    cultureRoot.isCreatingItem = false
                                    cultureRoot.refreshItems()
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ===================================================================
    // Culture View & Details Modal (Parity with CultureViewModal.tsx)
    // ===================================================================
    Rectangle {
        id: cultureDetailsModal
        anchors.fill: parent
        color: "#aa000000"
        visible: cultureRoot.selectedItemForDetails !== null
        z: 90

        MouseArea {
            anchors.fill: parent
            onClicked: cultureRoot.selectedItemForDetails = null
        }

        Rectangle {
            width: Math.min(parent.width - 64, 620)
            height: Math.min(parent.height - 64, 480)
            anchors.centerIn: parent
            radius: 16
            color: "#1a1924"
            border.color: "#8b5cf655"
            border.width: 1

            MouseArea {
                anchors.fill: parent
            }

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 24
                spacing: 16

                // Modal Header
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    Text {
                        Layout.fillWidth: true
                        text: cultureRoot.selectedItemForDetails ? cultureRoot.selectedItemForDetails.title : ""
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.bold: true
                        elide: Text.ElideRight
                    }

                    Rectangle {
                        width: 28; height: 28; radius: 6
                        color: "#ffffff10"
                        Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 13 }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: cultureRoot.selectedItemForDetails = null
                        }
                    }
                }

                // Two-Column Body: Poster on Left, Details on Right
                RowLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    spacing: 20

                    // Left: Large Poster
                    Rectangle {
                        Layout.preferredWidth: 140
                        Layout.fillHeight: true
                        radius: 10
                        color: "#15141b"
                        border.color: "#ffffff0f"
                        clip: true

                        Image {
                            anchors.fill: parent
                            source: (cultureRoot.selectedItemForDetails && cultureRoot.selectedItemForDetails.cover_image) ? cultureRoot.selectedItemForDetails.cover_image : ""
                            fillMode: Image.PreserveAspectCrop
                            visible: status === Image.Ready
                        }

                        ColumnLayout {
                            anchors.centerIn: parent
                            visible: !cultureRoot.selectedItemForDetails || !cultureRoot.selectedItemForDetails.cover_image
                            spacing: 6
                            Text {
                                Layout.alignment: Qt.AlignHCenter
                                text: (cultureRoot.selectedItemForDetails && cultureRoot.selectedItemForDetails.type === "filme") ? "🎬" : ((cultureRoot.selectedItemForDetails && cultureRoot.selectedItemForDetails.type === "anime") ? "⛩️" : "📺")
                                font.pixelSize: 42
                            }
                            Text {
                                Layout.alignment: Qt.AlignHCenter
                                text: cultureRoot.selectedItemForDetails ? cultureRoot.selectedItemForDetails.type : ""
                                color: "#a7a9be"
                                font.pixelSize: 11
                            }
                        }
                    }

                    // Right: Details, Status, Steppers, Synopsis
                    ColumnLayout {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        spacing: 12

                        // Status Selector Pills
                        RowLayout {
                            spacing: 8
                            Text { text: "Status:"; color: "#a7a9be"; font.pixelSize: 12 }
                            Repeater {
                                model: [
                                    { key: "watching", label: "Assistindo" },
                                    { key: "finished", label: "Concluído" },
                                    { key: "backlog", label: "Na Fila" }
                                ]
                                delegate: Rectangle {
                                    property bool isCurStatus: (cultureRoot.selectedItemForDetails && cultureRoot.selectedItemForDetails.status === modelData.key)
                                    height: 24
                                    width: statusText.contentWidth + 14
                                    radius: 12
                                    color: isCurStatus ? "#8b5cf6" : "#ffffff10"
                                    border.color: isCurStatus ? "#a78bfa" : "transparent"

                                    Text {
                                        id: statusText
                                        anchors.centerIn: parent
                                        text: modelData.label
                                        color: isCurStatus ? "#ffffff" : "#a7a9be"
                                        font.pixelSize: 11
                                        font.bold: isCurStatus
                                    }

                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            if (cultureRoot.selectedItemForDetails) {
                                                dataController.updateCultureStatus(cultureRoot.selectedItemForDetails.id, modelData.key)
                                                var copy = Object.assign({}, cultureRoot.selectedItemForDetails)
                                                copy.status = modelData.key
                                                cultureRoot.selectedItemForDetails = copy
                                                cultureRoot.refreshItems()
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Progress Steppers
                        RowLayout {
                            spacing: 8
                            Text {
                                text: "Progresso: Ep. " + ((cultureRoot.selectedItemForDetails && cultureRoot.selectedItemForDetails.progress) || 0) + " / " + ((cultureRoot.selectedItemForDetails && cultureRoot.selectedItemForDetails.total_episodes) || "∞")
                                color: "#fffffe"
                                font.pixelSize: 13
                                font.bold: true
                            }

                            Item { Layout.fillWidth: true }

                            // -5
                            Rectangle {
                                width: 30; height: 26; radius: 6; color: "#262438"
                                Text { anchors.centerIn: parent; text: "-5"; color: "#a7a9be"; font.pixelSize: 10 }
                                MouseArea {
                                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        if (cultureRoot.selectedItemForDetails) {
                                            var newP = Math.max(0, (cultureRoot.selectedItemForDetails.progress || 0) - 5)
                                            dataController.updateCultureProgress(cultureRoot.selectedItemForDetails.id, newP)
                                            var copy = Object.assign({}, cultureRoot.selectedItemForDetails)
                                            copy.progress = newP
                                            cultureRoot.selectedItemForDetails = copy
                                            cultureRoot.refreshItems()
                                        }
                                    }
                                }
                            }

                            // -1
                            Rectangle {
                                width: 26; height: 26; radius: 6; color: "#262438"
                                Text { anchors.centerIn: parent; text: "-1"; color: "#a7a9be"; font.pixelSize: 10 }
                                MouseArea {
                                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        if (cultureRoot.selectedItemForDetails) {
                                            var newP = Math.max(0, (cultureRoot.selectedItemForDetails.progress || 0) - 1)
                                            dataController.updateCultureProgress(cultureRoot.selectedItemForDetails.id, newP)
                                            var copy = Object.assign({}, cultureRoot.selectedItemForDetails)
                                            copy.progress = newP
                                            cultureRoot.selectedItemForDetails = copy
                                            cultureRoot.refreshItems()
                                        }
                                    }
                                }
                            }

                            // +1
                            Rectangle {
                                width: 26; height: 26; radius: 6; color: "#8b5cf626"; border.color: "#8b5cf666"
                                Text { anchors.centerIn: parent; text: "+1"; color: "#c4b5fd"; font.pixelSize: 10; font.bold: true }
                                MouseArea {
                                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        if (cultureRoot.selectedItemForDetails) {
                                            var newP = (cultureRoot.selectedItemForDetails.progress || 0) + 1
                                            dataController.updateCultureProgress(cultureRoot.selectedItemForDetails.id, newP)
                                            var copy = Object.assign({}, cultureRoot.selectedItemForDetails)
                                            copy.progress = newP
                                            cultureRoot.selectedItemForDetails = copy
                                            cultureRoot.refreshItems()
                                        }
                                    }
                                }
                            }

                            // +5
                            Rectangle {
                                width: 30; height: 26; radius: 6; color: "#8b5cf626"; border.color: "#8b5cf666"
                                Text { anchors.centerIn: parent; text: "+5"; color: "#c4b5fd"; font.pixelSize: 10; font.bold: true }
                                MouseArea {
                                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        if (cultureRoot.selectedItemForDetails) {
                                            var newP = (cultureRoot.selectedItemForDetails.progress || 0) + 5
                                            dataController.updateCultureProgress(cultureRoot.selectedItemForDetails.id, newP)
                                            var copy = Object.assign({}, cultureRoot.selectedItemForDetails)
                                            copy.progress = newP
                                            cultureRoot.selectedItemForDetails = copy
                                            cultureRoot.refreshItems()
                                        }
                                    }
                                }
                            }
                        }

                        // Complete button
                        Rectangle {
                            Layout.fillWidth: true
                            height: 32
                            radius: 6
                            color: "#10b98120"
                            border.color: "#10b98155"
                            Text {
                                anchors.centerIn: parent
                                text: "Marcar Obra como Concluída ✓"
                                color: "#34d399"
                                font.pixelSize: 11
                                font.bold: true
                            }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    if (cultureRoot.selectedItemForDetails) {
                                        var total = cultureRoot.selectedItemForDetails.total_episodes || cultureRoot.selectedItemForDetails.progress || 1
                                        dataController.updateCultureProgress(cultureRoot.selectedItemForDetails.id, total)
                                        dataController.updateCultureStatus(cultureRoot.selectedItemForDetails.id, "finished")
                                        cultureRoot.refreshItems()
                                        cultureRoot.selectedItemForDetails = null
                                    }
                                }
                            }
                        }

                        // Synopsis Section
                        Text { text: "Sinopse:"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }

                        ScrollView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            clip: true

                            Text {
                                width: parent.width
                                text: (cultureRoot.selectedItemForDetails && cultureRoot.selectedItemForDetails.synopsis) ? cultureRoot.selectedItemForDetails.synopsis : "Sem sinopse cadastrada."
                                color: "#fffffe"
                                font.pixelSize: 12
                                wrapMode: Text.WordWrap
                                lineHeight: 1.4
                            }
                        }
                    }
                }
            }
        }
    }
}
