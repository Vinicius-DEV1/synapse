import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: calendarRoot
    color: "#0f0e17" // bg-dark-bg

    property var allEvents: []
    property var filteredEvents: []
    property string activeStatusFilter: "all" // "all", "pending", "completed"
    property string searchFilter: ""
    property string viewMode: "grid" // "grid", "list"
    property var currentMonthDate: new Date()
    property bool isCreatingEvent: false
    property string selectedColor: "#3b82f6"
    property var monthCells: []

    function updateMonthCells() {
        monthCells = getMonthCells()
    }

    function refreshEvents() {
        allEvents = dataController.getCalendarEvents()
        applyFilters()
        updateMonthCells()
    }

    function formatMonthYear(d) {
        var months = [
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ]
        return months[d.getMonth()] + " de " + d.getFullYear()
    }

    function prevMonth() {
        var y = currentMonthDate.getFullYear()
        var m = currentMonthDate.getMonth()
        currentMonthDate = new Date(y, m - 1, 1)
        applyFilters()
        updateMonthCells()
    }

    function nextMonth() {
        var y = currentMonthDate.getFullYear()
        var m = currentMonthDate.getMonth()
        currentMonthDate = new Date(y, m + 1, 1)
        applyFilters()
        updateMonthCells()
    }

    function goToToday() {
        currentMonthDate = new Date()
        applyFilters()
        updateMonthCells()
    }

    function getEventsForDate(dateStr) {
        var matches = []
        for (var i = 0; i < allEvents.length; i++) {
            var ev = allEvents[i]
            var sDate = ev.start_date || ev.start_time || ""
            if (sDate.indexOf(dateStr) !== -1) {
                matches.push(ev)
            }
        }
        return matches
    }

    function getMonthCells() {
        var year = currentMonthDate.getFullYear()
        var month = currentMonthDate.getMonth()
        var firstDayIndex = new Date(year, month, 1).getDay()
        var daysInCurrent = new Date(year, month + 1, 0).getDate()
        var daysInPrev = new Date(year, month, 0).getDate()

        var today = new Date()
        var todayStr = Qt.formatDate(today, "yyyy-MM-dd")

        var cells = []
        // Leading days from previous month
        for (var p = firstDayIndex - 1; p >= 0; p--) {
            var dayNum = daysInPrev - p
            var prevDateStr = Qt.formatDate(new Date(year, month - 1, dayNum), "yyyy-MM-dd")
            cells.push({
                dayNum: dayNum,
                isCurrentMonth: false,
                dateStr: prevDateStr,
                isToday: false,
                events: getEventsForDate(prevDateStr)
            })
        }

        // Days in current month
        for (var d = 1; d <= daysInCurrent; d++) {
            var dateStr = Qt.formatDate(new Date(year, month, d), "yyyy-MM-dd")
            cells.push({
                dayNum: d,
                isCurrentMonth: true,
                dateStr: dateStr,
                isToday: (dateStr === todayStr),
                events: getEventsForDate(dateStr)
            })
        }

        // Trailing days to fill 35 or 42 cells
        var totalCells = (cells.length > 35) ? 42 : 35
        var nextDay = 1
        while (cells.length < totalCells) {
            var nextDateStr = Qt.formatDate(new Date(year, month + 1, nextDay), "yyyy-MM-dd")
            cells.push({
                dayNum: nextDay,
                isCurrentMonth: false,
                dateStr: nextDateStr,
                isToday: false,
                events: getEventsForDate(nextDateStr)
            })
            nextDay++
        }

        return cells
    }

    function applyFilters() {
        var query = searchFilter.trim().toLowerCase()
        var result = []
        for (var i = 0; i < allEvents.length; i++) {
            var ev = allEvents[i]
            var matchStatus = true
            if (activeStatusFilter === "pending") {
                matchStatus = (ev.status !== "completed")
            } else if (activeStatusFilter === "completed") {
                matchStatus = (ev.status === "completed")
            }

            var matchSearch = true
            if (query.length > 0) {
                var title = (ev.title || "").toLowerCase()
                var desc = (ev.description || "").toLowerCase()
                matchSearch = (title.indexOf(query) !== -1 || desc.indexOf(query) !== -1)
            }

            if (matchStatus && matchSearch) {
                result.push(ev)
            }
        }
        filteredEvents = result
    }

    Component.onCompleted: {
        refreshEvents()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        // Top Header and Controls
        RowLayout {
            Layout.fillWidth: true
            spacing: 16

            ColumnLayout {
                spacing: 4
                Text {
                    text: "📅 Calendário & Agenda de Compromissos"
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
                Text {
                    text: calendarRoot.filteredEvents.length + " compromisso(s) listado(s) de " + calendarRoot.allEvents.length + " no total"
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
                border.color: eventSearchInput.activeFocus ? "#3b82f680" : "#ffffff12"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 12
                    anchors.rightMargin: 12
                    spacing: 8

                    Text { text: "🔍"; color: "#a7a9be"; font.pixelSize: 12 }

                    TextInput {
                        id: eventSearchInput
                        Layout.fillWidth: true
                        color: "#fffffe"
                        font.pixelSize: 13
                        selectByMouse: true
                        onTextChanged: {
                            calendarRoot.searchFilter = text
                            calendarRoot.applyFilters()
                        }

                        Text {
                            text: "Buscar compromisso..."
                            color: "#64748b"
                            font.pixelSize: 13
                            visible: !eventSearchInput.text && !eventSearchInput.activeFocus
                        }
                    }
                }
            }

            // View Switcher (Grid vs List)
            Rectangle {
                height: 40
                radius: 10
                color: "#15141b"
                border.color: "#ffffff12"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 4
                    spacing: 4

                    Rectangle {
                        width: 76; height: 32; radius: 7
                        color: calendarRoot.viewMode === "grid" ? "#262438" : "transparent"
                        Text { anchors.centerIn: parent; text: "📅 Mês"; color: calendarRoot.viewMode === "grid" ? "#fffffe" : "#a7a9be"; font.pixelSize: 12; font.bold: true }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: calendarRoot.viewMode = "grid" }
                    }

                    Rectangle {
                        width: 76; height: 32; radius: 7
                        color: calendarRoot.viewMode === "list" ? "#262438" : "transparent"
                        Text { anchors.centerIn: parent; text: "📋 Lista"; color: calendarRoot.viewMode === "list" ? "#fffffe" : "#a7a9be"; font.pixelSize: 12; font.bold: true }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: calendarRoot.viewMode = "list" }
                    }
                }
            }

            // Status Filter Tabs
            Rectangle {
                height: 40
                radius: 10
                color: "#15141b"
                border.color: "#ffffff12"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 4
                    spacing: 4

                    // Tab: Todos
                    Rectangle {
                        width: 70
                        height: 32
                        radius: 7
                        color: calendarRoot.activeStatusFilter === "all" ? "#262438" : "transparent"
                        Text {
                            anchors.centerIn: parent
                            text: "Todos"
                            color: calendarRoot.activeStatusFilter === "all" ? "#fffffe" : "#a7a9be"
                            font.pixelSize: 12
                            font.bold: calendarRoot.activeStatusFilter === "all"
                        }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                calendarRoot.activeStatusFilter = "all"
                                calendarRoot.applyFilters()
                            }
                        }
                    }

                    // Tab: Pendentes
                    Rectangle {
                        width: 80
                        height: 32
                        radius: 7
                        color: calendarRoot.activeStatusFilter === "pending" ? "#262438" : "transparent"
                        Text {
                            anchors.centerIn: parent
                            text: "Pendentes"
                            color: calendarRoot.activeStatusFilter === "pending" ? "#38bdf8" : "#a7a9be"
                            font.pixelSize: 12
                            font.bold: calendarRoot.activeStatusFilter === "pending"
                        }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                calendarRoot.activeStatusFilter = "pending"
                                calendarRoot.applyFilters()
                            }
                        }
                    }

                    // Tab: Concluídos
                    Rectangle {
                        width: 86
                        height: 32
                        radius: 7
                        color: calendarRoot.activeStatusFilter === "completed" ? "#262438" : "transparent"
                        Text {
                            anchors.centerIn: parent
                            text: "Concluídos"
                            color: calendarRoot.activeStatusFilter === "completed" ? "#34d399" : "#a7a9be"
                            font.pixelSize: 12
                            font.bold: calendarRoot.activeStatusFilter === "completed"
                        }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                calendarRoot.activeStatusFilter = "completed"
                                calendarRoot.applyFilters()
                            }
                        }
                    }
                }
            }

            // "+ Novo Evento" Button
            Rectangle {
                width: 136
                height: 40
                radius: 10
                color: "#3b82f6" // blue-600

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Novo Evento"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    hoverEnabled: true
                    onEntered: parent.color = "#2563eb"
                    onExited: parent.color = "#3b82f6"
                    onClicked: {
                        eventTitleInput.text = ""
                        eventDescInput.text = ""
                        calendarRoot.selectedColor = "#3b82f6"
                        calendarRoot.isCreatingEvent = true
                    }
                }
            }
        }

        // Main View: Month Calendar Grid OR Events List
        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: calendarRoot.viewMode === "grid" ? 0 : 1

            // =================================================================
            // View 1: Month Calendar Grid
            // =================================================================
            ColumnLayout {
                id: monthGridView
                spacing: 12

                // Month Nav Bar
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    Rectangle {
                        width: 32; height: 32; radius: 8
                        color: "#161524"; border.color: "#ffffff15"
                        Text { anchors.centerIn: parent; text: "‹"; color: "#fffffe"; font.pixelSize: 18 }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: calendarRoot.prevMonth() }
                    }

                    Text {
                        text: calendarRoot.formatMonthYear(calendarRoot.currentMonthDate)
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.bold: true
                    }

                    Rectangle {
                        width: 32; height: 32; radius: 8
                        color: "#161524"; border.color: "#ffffff15"
                        Text { anchors.centerIn: parent; text: "›"; color: "#fffffe"; font.pixelSize: 18 }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: calendarRoot.nextMonth() }
                    }

                    Rectangle {
                        width: 60; height: 32; radius: 8
                        color: "#161524"; border.color: "#ffffff15"
                        Text { anchors.centerIn: parent; text: "Hoje"; color: "#38bdf8"; font.pixelSize: 12; font.bold: true }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: calendarRoot.goToToday() }
                    }

                    Item { Layout.fillWidth: true }
                }

                // Days of week header
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Repeater {
                        model: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
                        Rectangle {
                            Layout.fillWidth: true
                            height: 28
                            color: "transparent"
                            Text {
                                anchors.centerIn: parent
                                text: modelData
                                color: "#64748b"
                                font.pixelSize: 12
                                font.bold: true
                            }
                        }
                    }
                }

                // Grid of 35 or 42 cells
                GridView {
                    id: monthCellsGrid
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    cellWidth: width / 7
                    cellHeight: Math.max(76, height / Math.ceil(model.length / 7))
                    model: calendarRoot.monthCells

                    delegate: Rectangle {
                        width: monthCellsGrid.cellWidth - 4
                        height: monthCellsGrid.cellHeight - 4
                        x: 2; y: 2
                        radius: 8
                        color: modelData.isToday ? "#1e293b" : (cellMouse.containsMouse ? "#201e30" : "#141320")
                        border.color: modelData.isToday ? "#38bdf888" : "#ffffff0a"
                        border.width: 1

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 6
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                Rectangle {
                                    width: 22; height: 22; radius: 11
                                    color: modelData.isToday ? "#38bdf8" : "transparent"
                                    Text {
                                        anchors.centerIn: parent
                                        text: modelData.dayNum
                                        color: modelData.isToday ? "#0f172a" : (modelData.isCurrentMonth ? "#fffffe" : "#475569")
                                        font.pixelSize: 11
                                        font.bold: modelData.isToday
                                    }
                                }
                                Item { Layout.fillWidth: true }
                            }

                            // Day's events summary pills
                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Repeater {
                                    model: modelData.events ? modelData.events.slice(0, 2) : []
                                    Rectangle {
                                        Layout.fillWidth: true
                                        height: 18
                                        radius: 4
                                        color: (modelData.color || "#3b82f6") + "33"
                                        border.color: (modelData.color || "#3b82f6") + "66"
                                        RowLayout {
                                            anchors.fill: parent
                                            anchors.leftMargin: 4
                                            anchors.rightMargin: 4
                                            Rectangle {
                                                width: 6; height: 6; radius: 3
                                                color: modelData.color || "#3b82f6"
                                            }
                                            Text {
                                                text: modelData.title
                                                color: "#fffffe"
                                                font.pixelSize: 10
                                                elide: Text.ElideRight
                                                Layout.fillWidth: true
                                            }
                                        }
                                    }
                                }
                                Text {
                                    visible: modelData.events && modelData.events.length > 2
                                    text: "+" + (modelData.events.length - 2) + " mais"
                                    color: "#64748b"
                                    font.pixelSize: 9
                                }
                            }
                            Item { Layout.fillHeight: true }
                        }

                        MouseArea {
                            id: cellMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                eventTitleInput.text = ""
                                eventDescInput.text = ""
                                eventDateInput.text = modelData.dateStr + "T09:00:00"
                                calendarRoot.selectedColor = "#3b82f6"
                                calendarRoot.isCreatingEvent = true
                            }
                        }
                    }
                }
            }

            // =================================================================
            // View 2: Events ListView
            // =================================================================
            ListView {
                id: eventListView
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                model: calendarRoot.filteredEvents
                spacing: 10

                delegate: Rectangle {
                    id: eventRowDelegate
                    width: eventListView.width
                    height: 72
                    radius: 12
                    color: rowMouse.containsMouse ? "#211f30" : "#1a1924" // bg-dark-card
                    border.color: rowMouse.containsMouse ? "#3b82f666" : (modelData.status === "completed" ? "#10b98126" : "#ffffff0f")
                    border.width: 1

                    Behavior on color { ColorAnimation { duration: 150 } }
                    Behavior on border.color { ColorAnimation { duration: 150 } }

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 16

                        // Left Colored Indicator Stripe
                        Rectangle {
                            width: 4
                            height: 40
                            radius: 2
                            color: modelData.color || "#3b82f6"
                        }

                        // Event Details
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            Text {
                                text: modelData.title
                                color: modelData.status === "completed" ? "#64748b" : "#fffffe"
                                font.pixelSize: 15
                                font.bold: true
                                font.strikeout: modelData.status === "completed"
                                elide: Text.ElideRight
                            }

                            RowLayout {
                                spacing: 8
                                Text {
                                    text: modelData.start_date ? Qt.formatDateTime(new Date(modelData.start_date), "dd/MM/yyyy às hh:mm") : "Sem data definida"
                                    color: "#a7a9be"
                                    font.pixelSize: 12
                                }
                                Text {
                                    visible: (modelData.description || "").trim().length > 0
                                    text: "•"
                                    color: "#64748b"
                                    font.pixelSize: 12
                                }
                                Text {
                                    visible: (modelData.description || "").trim().length > 0
                                    text: modelData.description || ""
                                    color: "#a7a9be"
                                    font.pixelSize: 12
                                    elide: Text.ElideRight
                                    Layout.maximumWidth: 400
                                }
                            }
                        }

                        // Status Toggle Pill
                        Rectangle {
                            width: 110
                            height: 32
                            radius: 8
                            color: modelData.status === "completed" ? "#10b9811a" : "#3b82f61a"
                            border.color: modelData.status === "completed" ? "#10b98133" : "#3b82f633"

                            RowLayout {
                                anchors.centerIn: parent
                                spacing: 6
                                Text {
                                    text: modelData.status === "completed" ? "✓" : "○"
                                    color: modelData.status === "completed" ? "#34d399" : "#60a5fa"
                                    font.pixelSize: 12
                                }
                                Text {
                                    text: modelData.status === "completed" ? "Concluído" : "Pendente"
                                    color: modelData.status === "completed" ? "#34d399" : "#60a5fa"
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    dataController.toggleEventStatus(modelData.id)
                                    calendarRoot.refreshEvents()
                                }
                            }
                        }

                        // Delete Event Button
                        Rectangle {
                            width: 32
                            height: 32
                            radius: 8
                            color: delMouse.containsMouse ? "#f43f5e26" : "transparent"
                            border.color: delMouse.containsMouse ? "#f43f5e55" : "transparent"

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
                                    dataController.deleteCalendarEvent(modelData.id)
                                    calendarRoot.refreshEvents()
                                }
                            }
                        }
                    }

                    MouseArea {
                        id: rowMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        z: -1
                    }
                }

                Text {
                    anchors.centerIn: parent
                    visible: calendarRoot.filteredEvents.length === 0
                    text: "Nenhum evento registrado nesta visualização."
                    color: "#64748b"
                    font.pixelSize: 15
                }
            }
        }
    }

    // ===================================================================
    // Modal: Novo Evento
    // ===================================================================
    Rectangle {
        anchors.fill: parent
        color: "#00000088"
        visible: calendarRoot.isCreatingEvent
        z: 95

        MouseArea {
            anchors.fill: parent
            onClicked: calendarRoot.isCreatingEvent = false
        }

        Rectangle {
            anchors.centerIn: parent
            width: 460
            height: 420
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
                spacing: 16

                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "📅 Novo Compromisso na Agenda"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: calendarRoot.isCreatingEvent = false
                        }
                    }
                }

                // Title Input
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Título do Compromisso"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true
                        height: 38
                        radius: 8
                        color: "#15141b"
                        border.color: eventTitleInput.activeFocus ? "#3b82f6" : "#ffffff15"
                        TextInput {
                            id: eventTitleInput
                            anchors.fill: parent
                            anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: 13
                            selectByMouse: true
                        }
                    }
                }

                // Description Input
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Descrição (opcional)"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true
                        height: 38
                        radius: 8
                        color: "#15141b"
                        border.color: eventDescInput.activeFocus ? "#3b82f6" : "#ffffff15"
                        TextInput {
                            id: eventDescInput
                            anchors.fill: parent
                            anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: 13
                            selectByMouse: true
                        }
                    }
                }

                // Date / Time Input
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Data e Hora"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true
                        height: 38
                        radius: 8
                        color: "#15141b"
                        border.color: eventDateInput.activeFocus ? "#3b82f6" : "#ffffff15"
                        TextInput {
                            id: eventDateInput
                            anchors.fill: parent
                            anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: 13
                            selectByMouse: true
                            text: Qt.formatDateTime(new Date(), "yyyy-MM-ddThh:mm:ss")
                        }
                    }
                }

                // Color Tag Picker
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Etiqueta de Cor"; color: "#a7a9be"; font.pixelSize: 12 }
                    RowLayout {
                        spacing: 10
                        Repeater {
                            model: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#06b6d4"]
                            delegate: Rectangle {
                                width: 28; height: 28; radius: 14
                                color: modelData
                                border.color: calendarRoot.selectedColor === modelData ? "#ffffff" : "transparent"
                                border.width: 2
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: calendarRoot.selectedColor = modelData
                                }
                            }
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
                            onClicked: calendarRoot.isCreatingEvent = false
                        }
                    }
                    Rectangle {
                        width: 120; height: 38; radius: 8; color: "#3b82f6"
                        Text { anchors.centerIn: parent; text: "Salvar Evento"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                if (eventTitleInput.text.trim().length > 0) {
                                    dataController.createCalendarEvent(eventTitleInput.text, eventDescInput.text, eventDateInput.text, eventDateInput.text, "event", calendarRoot.selectedColor)
                                    calendarRoot.isCreatingEvent = false
                                    calendarRoot.refreshEvents()
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
