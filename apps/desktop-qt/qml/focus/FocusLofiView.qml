import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: focusRoot
    color: "#0f0e17" // bg-dark-bg

    property string currentTab: "dashboard" // "dashboard", "timer", "stats", "lofi", "alarms"
    property int totalSeconds: 25 * 60
    property int remainingSeconds: 25 * 60
    property bool isRunning: false
    property string activeTag: "Estudo"
    property string activeDescription: "Sessão de foco"
    property var lofis: []
    property var focusSessions: []
    property var alarms: []
    property var activeLofi: (typeof globalLofiPlayer !== "undefined" && globalLofiPlayer) ? globalLofiPlayer.activeTrack : null
    property bool isLofiPlaying: (typeof globalLofiPlayer !== "undefined" && globalLofiPlayer) ? globalLofiPlayer.isPlaying : false

    // Modals visibility
    property bool isSetupModalOpen: false
    property bool isSettingsModalOpen: false
    property bool isCancelModalOpen: false
    property bool isDeleteModalOpen: false
    property bool isMixerModalOpen: false
    property bool isAlarmSetupModalOpen: false
    property bool isAlarmTriggerModalOpen: false
    property bool isCustomTimeOpen: false
    property bool isSessionCompletedModalOpen: false
    property string itemToDeleteId: ""
    property string itemToDeleteType: "session"

    signal requestPlayLofi(var lofi)

    function refreshData() {
        lofis = dataController.getLofis()
        focusSessions = dataController.getFocusSessions()
        alarms = dataController.getAlarms()
    }

    Component.onCompleted: {
        refreshData()
    }

    function setPreset(minutes) {
        isRunning = false
        timer.stop()
        totalSeconds = minutes * 60
        remainingSeconds = totalSeconds
    }

    function toggleTimer() {
        isRunning = !isRunning
        if (isRunning) {
            timer.start()
            currentTab = "timer"
        } else {
            timer.stop()
        }
    }

    function resetTimer() {
        isRunning = false
        timer.stop()
        remainingSeconds = totalSeconds
        currentTab = "dashboard"
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
                dataController.recordFocusSession(focusRoot.activeTag, Math.floor(focusRoot.totalSeconds / 60), "completed", "Sessão de foco concluída", focusRoot.activeDescription)
                focusRoot.refreshData()
                focusRoot.currentTab = "dashboard"
                focusRoot.isSessionCompletedModalOpen = true
            }
        }
    }

    function computeTodayMinutes() {
        var total = 0
        var todayStr = Qt.formatDate(new Date(), "yyyy-MM-dd")
        for (var i = 0; i < focusSessions.length; i++) {
            var s = focusSessions[i]
            if (s.created_at && s.created_at.indexOf(todayStr) !== -1 && s.status === "completed") {
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
            if (s.created_at && s.created_at.indexOf(todayStr) !== -1 && s.status === "completed") {
                count++
            }
        }
        return count
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Top Navigation Bar
        Rectangle {
            Layout.fillWidth: true
            height: 56
            color: "#161524"
            border.color: "#1affffff"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 24
                anchors.rightMargin: 24
                spacing: 12

                // Navigation Tabs
                RowLayout {
                    spacing: 6
                    Repeater {
                        model: [
                            { id: "dashboard", label: "⏱ Pomodoro", icon: "⏱" },
                            { id: "stats", label: "📊 Estatísticas", icon: "📊" },
                            { id: "lofi", label: "🎵 Lo-Fi & Ambiente", icon: "🎵" },
                            { id: "alarms", label: "🔔 Alarmes", icon: "🔔" }
                        ]
                        delegate: Button {
                            height: 36
                            flat: true
                            background: Rectangle {
                                color: focusRoot.currentTab === modelData.id ? "#8b5cf6" : "transparent"
                                radius: 8
                            }
                            contentItem: Text {
                                text: modelData.label
                                color: focusRoot.currentTab === modelData.id ? "#ffffff" : "#a7a9be"
                                font.pixelSize: 12
                                font.bold: true
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                                leftPadding: 12; rightPadding: 12
                            }
                            onClicked: {
                                if (focusRoot.currentTab === "timer") {
                                    // keep timer running in background
                                }
                                focusRoot.currentTab = modelData.id
                            }
                        }
                    }
                }

                Item { Layout.fillWidth: true }

                // Quick Action Buttons
                Button {
                    height: 34
                    flat: true
                    background: Rectangle { color: "#211f30"; radius: 8 }
                    contentItem: Text { text: "+ Nova Sessão"; color: "#ffffff"; font.pixelSize: 11; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter; leftPadding: 10; rightPadding: 10 }
                    onClicked: focusRoot.isSetupModalOpen = true
                }

                Button {
                    height: 34
                    flat: true
                    background: Rectangle { color: "#211f30"; radius: 8 }
                    contentItem: Text { text: "⚙ Ajustes"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter; leftPadding: 10; rightPadding: 10 }
                    onClicked: focusRoot.isSettingsModalOpen = true
                }

                Button {
                    height: 34
                    flat: true
                    background: Rectangle { color: "#211f30"; radius: 8 }
                    contentItem: Text { text: "? Ajuda"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter; leftPadding: 10; rightPadding: 10 }
                    onClicked: helpDialog.isOpen = true
                }
            }
        }

        // Main Body View Switcher
        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: {
                if (focusRoot.currentTab === "timer") return 1
                if (focusRoot.currentTab === "stats") return 2
                if (focusRoot.currentTab === "lofi") return 3
                if (focusRoot.currentTab === "alarms") return 4
                return 0 // dashboard
            }

            // Index 0: Dashboard (Pomodoro & History)
            Item {
                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 24
                    spacing: 24

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
                        onHelpRequested: helpDialog.isOpen = true
                    }

                    FocusHistorySection {
                        lofis: focusRoot.lofis
                        focusSessions: focusRoot.focusSessions
                        activeLofi: focusRoot.activeLofi
                        isLofiPlaying: focusRoot.isLofiPlaying

                        onLofiSelected: function(modelData) {
                            if (typeof globalLofiPlayer !== "undefined" && globalLofiPlayer) {
                                if (globalLofiPlayer.activeTrack && globalLofiPlayer.activeTrack.id === modelData.id) {
                                    globalLofiPlayer.togglePlay()
                                } else {
                                    globalLofiPlayer.playTrack(modelData)
                                }
                            } else {
                                focusRoot.requestPlayLofi(modelData)
                            }
                        }
                        onDeleteSessionRequested: function(sessionId) {
                            focusRoot.itemToDeleteId = sessionId
                            focusRoot.itemToDeleteType = "session"
                            focusRoot.isDeleteModalOpen = true
                        }
                    }
                }
            }

            // Index 1: Active Timer Fullscreen Canvas
            FocusActiveTimer {
                tag: focusRoot.activeTag
                description: focusRoot.activeDescription
                totalSeconds: focusRoot.totalSeconds
                remainingSeconds: focusRoot.remainingSeconds
                isPaused: !focusRoot.isRunning

                onAddMinutes: function(mins) {
                    focusRoot.totalSeconds += mins * 60
                    focusRoot.remainingSeconds += mins * 60
                }
                onTogglePause: focusRoot.toggleTimer()
                onRequestCancel: focusRoot.isCancelModalOpen = true
            }

            // Index 2: Stats View
            FocusStatsView {
                focusSessions: focusRoot.focusSessions
                onBackRequested: focusRoot.currentTab = "dashboard"
            }

            // Index 3: Lo-Fi Tracks Library
            LofiView {
                lofis: focusRoot.lofis
                activeLofi: focusRoot.activeLofi
                isPlaying: focusRoot.isLofiPlaying

                onBackRequested: focusRoot.currentTab = "dashboard"
                onOpenMixerRequested: focusRoot.isMixerModalOpen = true
                onPlayTrackRequested: function(track) {
                    if (typeof globalLofiPlayer !== "undefined" && globalLofiPlayer) {
                        if (globalLofiPlayer.activeTrack && globalLofiPlayer.activeTrack.id === track.id) {
                            globalLofiPlayer.togglePlay()
                        } else {
                            globalLofiPlayer.playTrack(track)
                        }
                    } else {
                        focusRoot.requestPlayLofi(track)
                    }
                }
                onDeleteTrackRequested: function(trackId) {
                    focusRoot.itemToDeleteId = trackId
                    focusRoot.itemToDeleteType = "lofi"
                    focusRoot.isDeleteModalOpen = true
                }
            }

            // Index 4: Alarms Manager
            AlarmsList {
                alarms: focusRoot.alarms
                onBackRequested: focusRoot.currentTab = "dashboard"
                onNewAlarmRequested: focusRoot.isAlarmSetupModalOpen = true
                onToggleAlarmRequested: function(alarmId) {
                    dataController.toggleAlarm(alarmId)
                    focusRoot.refreshData()
                }
                onDeleteAlarmRequested: function(alarmId) {
                    focusRoot.itemToDeleteId = alarmId
                    focusRoot.itemToDeleteType = "alarm"
                    focusRoot.isDeleteModalOpen = true
                }
            }
        }
    }

    // Modals
    FocusSetupModal {
        visible: focusRoot.isSetupModalOpen
        onClosed: focusRoot.isSetupModalOpen = false
        onStartSession: function(tag, desc, mins) {
            focusRoot.activeTag = tag
            focusRoot.activeDescription = desc
            focusRoot.setPreset(mins)
            focusRoot.toggleTimer()
            focusRoot.isSetupModalOpen = false
        }
    }

    FocusCancelModal {
        visible: focusRoot.isCancelModalOpen
        onAbortCancel: focusRoot.isCancelModalOpen = false
        onSaveCancel: function(justification) {
            focusRoot.isRunning = false
            timer.stop()
            var elapsedMins = Math.floor((focusRoot.totalSeconds - focusRoot.remainingSeconds) / 60)
            dataController.recordFocusSession(focusRoot.activeTag, elapsedMins, "cancelled", justification, focusRoot.activeDescription)
            focusRoot.refreshData()
            focusRoot.currentTab = "dashboard"
            focusRoot.isCancelModalOpen = false
        }
    }

    FocusSettingsModal {
        visible: focusRoot.isSettingsModalOpen
        onClosed: focusRoot.isSettingsModalOpen = false
        onClearHistoryRequested: function(range) {
            dataController.clearFocusSessions(range)
            focusRoot.refreshData()
            focusRoot.isSettingsModalOpen = false
        }
    }

    FocusDeleteModal {
        visible: focusRoot.isDeleteModalOpen
        title: focusRoot.itemToDeleteType === "alarm" ? "Excluir Alarme" : (focusRoot.itemToDeleteType === "lofi" ? "Excluir Trilha Lo-Fi" : "Excluir Sessão de Foco")
        description: "Tem certeza de que deseja excluir permanentemente este registro?"
        onClosed: focusRoot.isDeleteModalOpen = false
        onConfirmed: {
            if (focusRoot.itemToDeleteType === "alarm") {
                dataController.deleteAlarm(focusRoot.itemToDeleteId)
            } else if (focusRoot.itemToDeleteType === "lofi") {
                dataController.deleteLofi(focusRoot.itemToDeleteId)
            } else {
                dataController.deleteFocusSession(focusRoot.itemToDeleteId)
            }
            focusRoot.refreshData()
            focusRoot.isDeleteModalOpen = false
        }
    }

    AlarmSetupModal {
        visible: focusRoot.isAlarmSetupModalOpen
        onClosed: focusRoot.isAlarmSetupModalOpen = false
        onSaveAlarm: function(timeStr, label, sound, days) {
            dataController.createAlarm(timeStr, label, sound, true, days)
            focusRoot.refreshData()
            focusRoot.isAlarmSetupModalOpen = false
        }
    }

    property var activeAlarmData: null
    property string lastTriggeredMinute: ""

    Timer {
        id: alarmSchedulerTimer
        interval: 10000 // checks every 10 seconds
        running: true
        repeat: true
        onTriggered: {
            var now = new Date()
            var currentMinuteStr = Qt.formatDateTime(now, "yyyy-MM-dd HH:mm")
            var currentTime = Qt.formatDateTime(now, "HH:mm")
            var dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.

            if (focusRoot.lastTriggeredMinute === currentMinuteStr) return

            for (var i = 0; i < focusRoot.alarms.length; i++) {
                var alm = focusRoot.alarms[i]
                if (alm.enabled && alm.time === currentTime) {
                    var days = alm.days
                    if (typeof days === "string") {
                        try { days = JSON.parse(days) } catch(e) { days = [] }
                    }
                    var matchDay = (!days || days.length === 0 || days.indexOf(dayOfWeek) !== -1)
                    if (matchDay) {
                        focusRoot.lastTriggeredMinute = currentMinuteStr
                        focusRoot.activeAlarmData = alm
                        alarmTriggerModal.timeStr = alm.time
                        alarmTriggerModal.label = alm.label || "Alarme de Foco"
                        focusRoot.isAlarmTriggerModalOpen = true
                        break
                    }
                }
            }
        }
    }

    AlarmTriggerModal {
        id: alarmTriggerModal
        visible: focusRoot.isAlarmTriggerModalOpen
        onDismiss: {
            if (focusRoot.activeAlarmData && focusRoot.activeAlarmData.id) {
                var days = focusRoot.activeAlarmData.days
                if (typeof days === "string") {
                    try { days = JSON.parse(days) } catch(e) { days = [] }
                }
                if (!days || days.length === 0) {
                    dataController.toggleAlarm(focusRoot.activeAlarmData.id)
                    focusRoot.refreshData()
                }
            }
            focusRoot.isAlarmTriggerModalOpen = false
            focusRoot.activeAlarmData = null
        }
        onSnooze: function(mins) {
            focusRoot.isAlarmTriggerModalOpen = false
            var snoozeDate = new Date(new Date().getTime() + mins * 60000)
            focusRoot.lastTriggeredMinute = Qt.formatDateTime(snoozeDate, "yyyy-MM-dd HH:mm")
        }
    }

    LofiSoundMixerModal {
        visible: focusRoot.isMixerModalOpen
        onClosed: focusRoot.isMixerModalOpen = false
    }

    FocusCustomTimeModal {
        visible: focusRoot.isCustomTimeOpen
        onClosed: focusRoot.isCustomTimeOpen = false
        onTimeSet: function(mins) {
            focusRoot.setPreset(mins)
            focusRoot.isCustomTimeOpen = false
        }
    }

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

    FocusHelpDialog {
        id: helpDialog
        onClosed: isOpen = false
    }
}
