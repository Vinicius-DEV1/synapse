import QtQuick 2.15
import QtQuick.Controls 2.15
import QtTest 1.15
import "../../../qml/notes"

Item {
    id: testRoot
    width: 800
    height: 600

    QtObject {
        id: theme
        property color bgDarkBg: "#0f0e17"
        property color bgDarkCard: "#161524"
        property color bgElevated: "#1e1c30"
        property color brand500: "#8b5cf6"
        property color textPrimary: "#fffffe"
        property color textSubtext: "#a7a9be"
        property color borderSubtle: "#14ffffff"
    }

    QtObject {
        id: mockController
        property var events: ({})
        property bool failToggle: false
        property bool failUpdate: false
        property bool failDelete: false
        property int toggleCalls: 0
        property int updateCalls: 0
        property int deleteCalls: 0
        property int deleteSeriesCalls: 0
        property var lastUpdateArgs: null

        signal calendarEventsChanged()

        function getCalendarEvent(id) {
            return events[id] || null
        }

        function toggleEventStatus(id) {
            toggleCalls += 1
            if (failToggle || !events[id]) return false
            var current = events[id]
            current.status = current.status === "completed" ? "pending" : "completed"
            return true
        }

        function updateCalendarEvent(id, title, description, startDate, endDate, color, type, pageId, reminders) {
            updateCalls += 1
            lastUpdateArgs = {
                id: id,
                title: title,
                description: description,
                startDate: startDate,
                endDate: endDate,
                color: color,
                type: type,
                pageId: pageId,
                reminders: reminders
            }
            if (failUpdate || !events[id]) return false
            events[id].title = title
            events[id].start_date = startDate
            events[id].end_date = endDate
            return true
        }

        function deleteCalendarEvent(id) {
            deleteCalls += 1
            if (failDelete || !events[id]) return false
            delete events[id]
            return true
        }

        function deleteCalendarEventSeries(id) {
            deleteSeriesCalls += 1
            if (failDelete || !events[id]) return false
            delete events[id]
            return true
        }
    }

    function resetController() {
        mockController.events = ({})
        mockController.failToggle = false
        mockController.failUpdate = false
        mockController.failDelete = false
        mockController.toggleCalls = 0
        mockController.updateCalls = 0
        mockController.deleteCalls = 0
        mockController.deleteSeriesCalls = 0
        mockController.lastUpdateArgs = null
    }

    Component {
        id: widgetComponent
        CalendarEventWidget {
            controller: mockController
        }
    }

    Component {
        id: stateComponent
        CalendarEventWidgetState {
            controller: mockController
        }
    }

    TestCase {
        name: "NotesCalendarEventWidget"
        when: windowShown

        function test_syncPreservesIndependentWidgetColorAndHandlesToggleFailure() {
            resetController()
            var futureStart = new Date(Date.now() + 2 * 3600 * 1000).toISOString()
            var futureEnd = new Date(Date.now() + 3 * 3600 * 1000).toISOString()
            mockController.events["evt-1"] = {
                id: "evt-1",
                title: "Agenda Title",
                start_date: futureStart,
                end_date: futureEnd,
                color: "#ef4444",
                status: "pending",
                reminders: [15, 60]
            }

            var widget = createTemporaryObject(widgetComponent, testRoot, {
                blockData: {
                    id: "blk-evt-1",
                    blockType: "calendarEventWidget",
                    attrs: {
                        "data-event-id": "evt-1",
                        "data-title": "Old Title",
                        "data-color": "#3b82f6",
                        "data-status": "pending"
                    }
                }
            })
            verify(widget !== null)
            compare(widget.title, "Agenda Title")
            // Agenda record color (#ef4444) must NOT overwrite widget data-color (#3b82f6) (QT-NOTES-020)
            compare(widget.eventColor, "#3b82f6")
            compare(widget.isCompleted, false)

            // Failed Core toggle must keep local status intact (QT-NOTES-019)
            mockController.failToggle = true
            var attrsUpdates = 0
            widget.attrsUpdated.connect(function() { attrsUpdates += 1 })
            var stateObj = createTemporaryObject(stateComponent, testRoot, {
                blockData: widget.blockData
            })
            verify(stateObj !== null)
            compare(stateObj.toggleStatus(), false)
            compare(stateObj.isCompleted, false)
            verify(stateObj.statusErrorMessage.length > 0)

            // Successful Core toggle updates state and emits attrsUpdated
            mockController.failToggle = false
            var stateUpdates = 0
            stateObj.attrsUpdated.connect(function() { stateUpdates += 1 })
            compare(stateObj.toggleStatus(), true)
            compare(stateObj.isCompleted, true)
            compare(stateUpdates, 1)
        }

        function test_editDetailsNormalizesDateAndPreservesDurationAndReminders() {
            resetController()
            var startMs = Date.UTC(2026, 11, 10, 14, 0, 0)
            var endMs = startMs + 90 * 60 * 1000 // 90-minute duration
            mockController.events["evt-2"] = {
                id: "evt-2",
                title: "Initial",
                description: "Desc",
                start_date: new Date(startMs).toISOString(),
                end_date: new Date(endMs).toISOString(),
                color: "#10b981",
                type: "estudo",
                page_id: "page-9",
                status: "pending",
                reminders: "[15,1440]"
            }

            var stateObj = createTemporaryObject(stateComponent, testRoot, {
                blockData: {
                    attrs: {
                        "data-event-id": "evt-2",
                        "data-title": "Initial",
                        "data-date": new Date(startMs).toISOString()
                    }
                }
            })
            verify(stateObj !== null)

            // Space-separated date/time must parse cleanly
            compare(stateObj.saveEventDetails("Updated Study", "2026-12-12 16:30"), true)
            compare(mockController.updateCalls, 1)
            compare(mockController.lastUpdateArgs.title, "Updated Study")
            compare(mockController.lastUpdateArgs.reminders.length, 2)
            var savedDuration = Date.parse(mockController.lastUpdateArgs.endDate) -
                Date.parse(mockController.lastUpdateArgs.startDate)
            compare(savedDuration, 90 * 60 * 1000)

            // Core failure leaves title unchanged
            mockController.failUpdate = true
            compare(stateObj.saveEventDetails("Should Fail", "2026-12-13 10:00"), false)
            compare(stateObj.title, "Updated Study")
        }

        function test_liveWindowBoundariesStopOnCompletionOrMissingEvent() {
            resetController()
            var now = Date.now()
            mockController.events["evt-live"] = {
                id: "evt-live",
                title: "Live Check",
                start_date: new Date(now + 10 * 60 * 1000).toISOString(), // -10m (inside -15..+60)
                end_date: new Date(now + 70 * 60 * 1000).toISOString(),
                status: "pending"
            }

            var stateObj = createTemporaryObject(stateComponent, testRoot, {
                blockData: { attrs: { "data-event-id": "evt-live" } }
            })
            verify(stateObj !== null)
            stateObj.currentTimestamp = now
            compare(stateObj.isLive, true)

            // Before -15m boundary -> not live
            stateObj.currentTimestamp = stateObj.eventStartTimestamp - (15 * 60 * 1000 + 1)
            compare(stateObj.isLive, false)
            // Exact -15m boundary -> live
            stateObj.currentTimestamp = stateObj.eventStartTimestamp - (15 * 60 * 1000)
            compare(stateObj.isLive, true)
            // Exact +60m boundary -> live
            stateObj.currentTimestamp = stateObj.eventStartTimestamp + (60 * 60 * 1000)
            compare(stateObj.isLive, true)
            // Past +60m boundary -> not live
            stateObj.currentTimestamp = stateObj.eventStartTimestamp + (60 * 60 * 1000 + 1)
            compare(stateObj.isLive, false)

            // Completed stops live state
            stateObj.currentTimestamp = now
            compare(stateObj.isLive, true)
            stateObj.status = "completed"
            compare(stateObj.isLive, false)
        }

        function test_deleteConfirmationRespectsActiveRecurringExpiredAndUnlinkedEvents() {
            resetController()
            var futureStart = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
            var pastStart = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

            mockController.events["evt-rec"] = {
                id: "evt-rec",
                title: "Recurring",
                start_date: futureStart,
                end_date: futureStart,
                recurrence_rule: "group_abc"
            }
            mockController.events["evt-exp"] = {
                id: "evt-exp",
                title: "Expired",
                start_date: pastStart,
                end_date: pastStart
            }

            var capturedConfirm = null
            var fakeDialog = {
                lastMessage: "",
                showDialog: function(title, message, onConfirm) {
                    this.lastMessage = message
                    capturedConfirm = onConfirm
                }
            }

            // 1. Active recurring event deletes series
            var recState = createTemporaryObject(stateComponent, testRoot, {
                blockData: { attrs: { "data-event-id": "evt-rec" } }
            })
            var recRemoved = 0
            recState.removeRequested.connect(function() { recRemoved += 1 })
            recState.requestDeleteConfirmation(fakeDialog)
            verify(fakeDialog.lastMessage.indexOf("série recorrente") !== -1)
            capturedConfirm()
            compare(mockController.deleteSeriesCalls, 1)
            compare(recRemoved, 1)

            // 2. Expired event keeps Core record and removes only widget
            var expState = createTemporaryObject(stateComponent, testRoot, {
                blockData: { attrs: { "data-event-id": "evt-exp" } }
            })
            var expRemoved = 0
            expState.removeRequested.connect(function() { expRemoved += 1 })
            expState.requestDeleteConfirmation(fakeDialog)
            verify(fakeDialog.lastMessage.indexOf("mantido na agenda") !== -1)
            capturedConfirm()
            compare(mockController.deleteCalls, 0)
            compare(mockController.deleteSeriesCalls, 1)
            compare(expRemoved, 1)
            verify(mockController.events["evt-exp"] !== undefined)

            // 3. Unlinked legacy widget removes cleanly without calling Core
            var unlinkedState = createTemporaryObject(stateComponent, testRoot, {
                blockData: { attrs: { "data-title": "Legacy Event" } }
            })
            var unlinkedRemoved = 0
            unlinkedState.removeRequested.connect(function() { unlinkedRemoved += 1 })
            unlinkedState.requestDeleteConfirmation(fakeDialog)
            capturedConfirm()
            compare(mockController.deleteCalls, 0)
            compare(unlinkedRemoved, 1)
        }
    }
}
