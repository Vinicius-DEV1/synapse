import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: focusRoot
    color: "#0f0e17" // bg-dark-bg

    property int totalSeconds: 25 * 60
    property int remainingSeconds: 25 * 60
    property bool isRunning: false
    property string activeTag: "Estudo"
    property var lofis: []
    property var focusSessions: []
    property var activeLofi: null
    property bool isLofiPlaying: false
    property bool isCustomTimeOpen: false
    property bool isSessionCompletedModalOpen: false

    signal requestPlayLofi(var lofi)

    function setPreset(minutes) {
        isRunning = false
        timer.stop()
        totalSeconds = minutes * 60
        remainingSeconds = totalSeconds
    }

    function toggleTimer() {
        isRunning = !isRunning
        if (isRunning) timer.start()
        else timer.stop()
    }

    function resetTimer() {
        isRunning = false
        timer.stop()
        remainingSeconds = totalSeconds
    }

    Timer {
        id: timer
        interval: 1000
        repeat: true
        onTriggered: {
            if (focusRoot.remainingSeconds > 0) {
                focusRoot.remainingSeconds--
            } else {
                focusRoot.isRunning = false
                timer.stop()
                dataController.recordFocusSession(focusRoot.activeTag, Math.floor(focusRoot.totalSeconds / 60), "completed", "Sessão de foco concluída")
                focusRoot.refreshData()
                focusRoot.isSessionCompletedModalOpen = true
            }
        }
    }

    function refreshData() {
        lofis = dataController.getLofis()
        focusSessions = dataController.getFocusSessions()
    }

    function computeTodayMinutes() {
        var total = 0
        var todayStr = Qt.formatDate(new Date(), "yyyy-MM-dd")
        for (var i = 0; i < focusSessions.length; i++) {
            var s = focusSessions[i]
            if (s.created_at && s.created_at.indexOf(todayStr) !== -1) {
                total += (s.target_time_minutes || 0)
            }
        }
        return total
    }

    function computeTodaySessions() {
        var count = 0
        var todayStr = Qt.formatDate(new Date(), "yyyy-MM-dd")
        for (var i = 0; i < focusSessions.length; i++) {
            var s = focusSessions[i]
            if (s.created_at && s.created_at.indexOf(todayStr) !== -1) {
                count++
            }
        }
        return count
    }

    Component.onCompleted: {
        refreshData()
    }

    RowLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 32

        // Left Area: Circular Pomodoro Timer & Stats
        PomodoroTimerCanvas {
            totalSeconds: focusRoot.totalSeconds
            remainingSeconds: focusRoot.remainingSeconds
            isRunning: focusRoot.isRunning
            activeTag: focusRoot.activeTag
            todayMinutes: focusRoot.computeTodayMinutes()
            todaySessions: focusRoot.computeTodaySessions()

            onTagSelected: function(tag) { focusRoot.activeTag = tag }
            onPresetSelected: function(minutes) { focusRoot.setPreset(minutes) }
            onCustomTimeRequested: focusRoot.isCustomTimeOpen = true
            onStartPauseRequested: focusRoot.toggleTimer()
            onResetRequested: focusRoot.resetTimer()
        }

        // Right Area: Lofi Ambient & Session History
        FocusHistorySection {
            lofis: focusRoot.lofis
            focusSessions: focusRoot.focusSessions
            activeLofi: focusRoot.activeLofi
            isLofiPlaying: focusRoot.isLofiPlaying

            onLofiSelected: function(modelData) {
                if (focusRoot.activeLofi === modelData) {
                    focusRoot.isLofiPlaying = !focusRoot.isLofiPlaying
                    if (typeof globalLofiPlayer !== "undefined") {
                        globalLofiPlayer.togglePlay()
                    }
                } else {
                    focusRoot.activeLofi = modelData
                    focusRoot.isLofiPlaying = true
                    focusRoot.requestPlayLofi(modelData)
                }
            }
            onDeleteSessionRequested: function(sessionId) {
                dataController.deleteFocusSession(sessionId)
                focusRoot.refreshData()
            }
        }
    }

    // Custom Timer Modal
    FocusCustomTimeModal {
        visible: focusRoot.isCustomTimeOpen
        onClosed: focusRoot.isCustomTimeOpen = false
        onTimeSet: function(mins) {
            focusRoot.setPreset(mins)
            focusRoot.isCustomTimeOpen = false
        }
    }

    // Session Completed Celebration Modal
    FocusCelebrationModal {
        visible: focusRoot.isSessionCompletedModalOpen
        totalMinutes: Math.floor(focusRoot.totalSeconds / 60)
        activeTag: focusRoot.activeTag

        onClosed: focusRoot.isSessionCompletedModalOpen = false
        onStartShortBreak: {
            focusRoot.isSessionCompletedModalOpen = false
            focusRoot.setPreset(5)
            focusRoot.toggleTimer()
        }
        onStartNewPomodoro: {
            focusRoot.isSessionCompletedModalOpen = false
            focusRoot.setPreset(25)
            focusRoot.toggleTimer()
        }
    }
}
