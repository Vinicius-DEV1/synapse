import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: homeRoot
    color: "#0f0e17" // bg-dark-bg

    property var dashboardData: ({})
    property var todayEvents: []
    property var tomorrowEvents: []
    property var pinnedPages: []
    property var recentPages: []
    property var financialSummary: ({})
    property var habits: []

    signal navigateToTab(string tabKey)
    signal openPageId(string pageId)

    function refreshDashboard() {
        dashboardData = dataController.getHomeDashboardData()
        todayEvents = dashboardData.today_events || []
        tomorrowEvents = dashboardData.tomorrow_events || []
        pinnedPages = dashboardData.pinned_pages || []
        recentPages = dashboardData.recent_pages || []
        financialSummary = dashboardData.financial_summary || ({})
        habits = dashboardData.habits || []
    }

    function getGreeting() {
        var hour = new Date().getHours()
        if (hour >= 5 && hour < 12) return "Bom dia"
        if (hour >= 12 && hour < 18) return "Boa tarde"
        return "Boa noite"
    }

    function formatCurrentDate() {
        var d = new Date()
        var days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]
        var months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
        return days[d.getDay()] + ", " + d.getDate() + " de " + months[d.getMonth()] + " de " + d.getFullYear()
    }

    Component.onCompleted: {
        refreshDashboard()
    }

    ScrollView {
        anchors.fill: parent
        clip: true
        contentWidth: availableWidth

        ColumnLayout {
            width: Math.min(parent.width - 64, 1140)
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: 24

            Item { height: 16 } // Top padding

            // Greeting and 4 Quick Action cards
            HomeGreetingHeader {
                greeting: homeRoot.getGreeting()
                formattedDate: homeRoot.formatCurrentDate()
                deckCount: dataController.deckCount
                habitCount: homeRoot.habits.length

                onActionClicked: function(tabKey) {
                    homeRoot.navigateToTab(tabKey)
                }
            }

            // Two-column Main Dashboard Layout
            RowLayout {
                Layout.fillWidth: true
                spacing: 20
                Layout.alignment: Qt.AlignTop

                // Left Column (Agenda & Financials)
                HomeAgendaSection {
                    todayEvents: homeRoot.todayEvents
                    tomorrowEvents: homeRoot.tomorrowEvents
                    financialSummary: homeRoot.financialSummary

                    onViewCalendarRequested: homeRoot.navigateToTab("calendar")
                    onViewFinanceRequested: homeRoot.navigateToTab("finance")
                }

                // Right Column (Pinned & Recent Pages)
                HomeNotesSection {
                    pinnedPages: homeRoot.pinnedPages
                    recentPages: homeRoot.recentPages

                    onNoteSelected: function(pageId) {
                        homeRoot.openPageId(pageId)
                        homeRoot.navigateToTab("notes")
                    }
                }
            }

            Item { height: 24 } // Bottom padding
        }
    }
}
