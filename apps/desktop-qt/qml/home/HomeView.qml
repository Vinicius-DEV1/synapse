import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: homeRoot
    color: theme.bgDarkBg

    property var dashboardData: ({})
    property var todayEvents: []
    property var tomorrowEvents: []
    property var pinnedPages: []
    property var recentPages: []
    property int dueCardsCount: 0
    property bool isHelpOpen: false

    signal navigateToTab(string tabKey)
    signal openPageId(string pageId)
    signal createNewNoteRequested()

    function refreshDashboard() {
        dashboardData = dataController.getHomeDashboardData()
        todayEvents = dashboardData.today_events || []
        tomorrowEvents = dashboardData.tomorrow_events || []
        pinnedPages = dashboardData.pinned_pages || []
        recentPages = dashboardData.recent_pages || []
        dueCardsCount = dashboardData.due_cards_count || 0
    }

    function getGreeting() {
        var hour = new Date().getHours()
        if (hour >= 5 && hour < 12) return "Bom dia"
        if (hour >= 12 && hour < 18) return "Boa tarde"
        return "Boa noite"
    }

    function formatCurrentDate() {
        var d = new Date()
        var days = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"]
        var months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
        return days[d.getDay()] + ", " + d.getDate() + " de " + months[d.getMonth()]
    }

    Component.onCompleted: {
        refreshDashboard()
    }

    ScrollView {
        anchors.fill: parent
        clip: true
        contentWidth: availableWidth

        ColumnLayout {
            width: Math.min(parent.width - 64, 1100)
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: 24

            Item { height: 16 } // Top padding

            // Greeting and 4 Quick Action cards (Matching Image 1)
            HomeGreetingHeader {
                greeting: homeRoot.getGreeting()
                formattedDate: homeRoot.formatCurrentDate()
                dueCardsCount: homeRoot.dueCardsCount
                onActionClicked: function(tabKey) {
                    homeRoot.navigateToTab(tabKey)
                }
                onNewPageRequested: homeRoot.createNewNoteRequested()
                onHelpRequested: homeRoot.isHelpOpen = true
            }

            // Two-column Main Dashboard Layout
            RowLayout {
                Layout.fillWidth: true
                spacing: 24
                Layout.alignment: Qt.AlignTop

                // Left Column (Agenda de Hoje)
                HomeAgendaSection {
                    todayEvents: homeRoot.todayEvents
                    tomorrowEvents: homeRoot.tomorrowEvents
                    onViewCalendarRequested: homeRoot.navigateToTab("calendar")
                }

                // Right Column (Recentes & Pinned Pages)
                HomeNotesSection {
                    pinnedPages: homeRoot.pinnedPages
                    recentPages: homeRoot.recentPages
                    onNoteSelected: function(pageId) {
                        homeRoot.openPageId(pageId)
                        homeRoot.navigateToTab("notes")
                    }
                }
            }

            Item { height: 32 } // Bottom breathing room
        }
    }

    HomeHelpDialog {
        isOpen: homeRoot.isHelpOpen
        onClosed: homeRoot.isHelpOpen = false
    }

    Shortcut {
        sequence: "Escape"
        enabled: homeRoot.isHelpOpen
        onActivated: homeRoot.isHelpOpen = false
    }
}
