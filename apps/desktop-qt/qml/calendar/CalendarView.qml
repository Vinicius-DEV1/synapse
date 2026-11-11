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
    property var editingEvent: null
    property string initialCreateDate: ""
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

    function openCreateModal(dateStr) {
        editingEvent = null
        initialCreateDate = dateStr ? (dateStr + "T09:00:00") : Qt.formatDateTime(new Date(), "yyyy-MM-ddThh:mm:ss")
        createModal.resetFields()
        if (dateStr) {
            createModal.initialDateStr = initialCreateDate
        } else {
            createModal.initialDateStr = ""
        }
        isCreatingEvent = true
    }

    function openEditModal(eventData) {
        if (!eventData || !eventData.id) return
        editingEvent = eventData
        isCreatingEvent = true
    }

    Component.onCompleted: {
        refreshEvents()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        // Top Header and Controls
        CalendarHeader {
            filteredCount: calendarRoot.filteredEvents.length
            totalCount: calendarRoot.allEvents.length
            viewMode: calendarRoot.viewMode
            activeStatusFilter: calendarRoot.activeStatusFilter

            onSearchChanged: function(text) {
                calendarRoot.searchFilter = text
                calendarRoot.applyFilters()
            }
            onViewModeSelected: function(mode) {
                calendarRoot.viewMode = mode
            }
            onFilterSelected: function(status) {
                calendarRoot.activeStatusFilter = status
                calendarRoot.applyFilters()
            }
            onCreateEventRequested: calendarRoot.openCreateModal("")
        }

        // Main View: Month Calendar Grid OR Events List
        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: calendarRoot.viewMode === "grid" ? 0 : 1

            // View 1: Month Calendar Grid
            CalendarMonthGrid {
                monthCells: calendarRoot.monthCells
                currentMonthLabel: calendarRoot.formatMonthYear(calendarRoot.currentMonthDate)

                onPrevMonthRequested: calendarRoot.prevMonth()
                onNextMonthRequested: calendarRoot.nextMonth()
                onTodayRequested: calendarRoot.goToToday()
                onCellClicked: function(dateStr) { calendarRoot.openCreateModal(dateStr) }
                onEventClicked: function(eventData) { calendarRoot.openEditModal(eventData) }
            }

            // View 2: Events ListView
            CalendarAgendaList {
                events: calendarRoot.filteredEvents

                onEditRequested: function(eventData) { calendarRoot.openEditModal(eventData) }

                onToggleStatusRequested: function(eventId) {
                    dataController.toggleEventStatus(eventId)
                    calendarRoot.refreshEvents()
                }
                onDeleteRequested: function(eventId) {
                    dataController.deleteCalendarEvent(eventId)
                    calendarRoot.refreshEvents()
                }
            }
        }
    }

    // Modal: Novo Evento
    CreateEventModal {
        id: createModal
        visible: calendarRoot.isCreatingEvent
        initialEvent: calendarRoot.editingEvent

        onClosed: {
            calendarRoot.isCreatingEvent = false
            calendarRoot.editingEvent = null
        }
        onEventSubmitted: function(title, desc, dateTime, color) {
            var saved = calendarRoot.editingEvent
                ? dataController.updateCalendarEvent(calendarRoot.editingEvent.id, title, desc, dateTime, dateTime, color)
                : dataController.createCalendarEvent(title, desc, dateTime, dateTime, "event", color)
            if (!saved) {
                createModal.errorMessage = qsTr("The event could not be saved. Check the title and date.")
                return
            }
            calendarRoot.isCreatingEvent = false
            calendarRoot.editingEvent = null
            calendarRoot.refreshEvents()
        }
    }
}
