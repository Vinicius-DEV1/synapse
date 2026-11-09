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

            // Greeting Header
            RowLayout {
                Layout.fillWidth: true
                ColumnLayout {
                    spacing: 4
                    Text {
                        text: homeRoot.getGreeting() + ", Vinícius!"
                        color: "#fffffe"
                        font.pixelSize: 28
                        font.bold: true
                    }
                    Text {
                        text: "Hoje é " + homeRoot.formatCurrentDate()
                        color: "#a7a9be"
                        font.pixelSize: 14
                    }
                }
                Item { Layout.fillWidth: true }
                Rectangle {
                    width: 40; height: 40; radius: 10; color: "#1a1924"; border.color: "#ffffff12"
                    Text { anchors.centerIn: parent; text: "⚡"; font.pixelSize: 18 }
                }
            }

            // Quick Actions Bar (4 Cards)
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                // Action 1: Nova Nota
                Rectangle {
                    Layout.fillWidth: true
                    height: 84
                    radius: 12
                    color: a1Mouse.containsMouse ? "#201e30" : "#1a1924"
                    border.color: a1Mouse.containsMouse ? "#8b5cf680" : "#ffffff0f"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 12
                        Rectangle {
                            width: 44; height: 44; radius: 10; color: "#8b5cf626"
                            Text { anchors.centerIn: parent; text: "📝"; font.pixelSize: 20 }
                        }
                        ColumnLayout {
                            spacing: 2
                            Text { text: "Nova Nota"; color: "#fffffe"; font.pixelSize: 14; font.bold: true }
                            Text { text: "Abrir editor em branco"; color: "#a7a9be"; font.pixelSize: 11 }
                        }
                    }
                    MouseArea {
                        id: a1Mouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            homeRoot.navigateToTab("notes")
                        }
                    }
                }

                // Action 2: Flashcards
                Rectangle {
                    Layout.fillWidth: true
                    height: 84
                    radius: 12
                    color: a2Mouse.containsMouse ? "#201e30" : "#1a1924"
                    border.color: a2Mouse.containsMouse ? "#6366f180" : "#ffffff0f"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 12
                        Rectangle {
                            width: 44; height: 44; radius: 10; color: "#6366f126"
                            Text { anchors.centerIn: parent; text: "🎴"; font.pixelSize: 20 }
                        }
                        ColumnLayout {
                            spacing: 2
                            Text { text: "Revisão Anki"; color: "#fffffe"; font.pixelSize: 14; font.bold: true }
                            Text { text: dataController.deckCount + " baralhos disponíveis"; color: "#a7a9be"; font.pixelSize: 11 }
                        }
                    }
                    MouseArea {
                        id: a2Mouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: homeRoot.navigateToTab("anki")
                    }
                }

                // Action 3: Pomodoro Foco
                Rectangle {
                    Layout.fillWidth: true
                    height: 84
                    radius: 12
                    color: a3Mouse.containsMouse ? "#201e30" : "#1a1924"
                    border.color: a3Mouse.containsMouse ? "#10b98180" : "#ffffff0f"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 12
                        Rectangle {
                            width: 44; height: 44; radius: 10; color: "#10b98126"
                            Text { anchors.centerIn: parent; text: "⏳"; font.pixelSize: 20 }
                        }
                        ColumnLayout {
                            spacing: 2
                            Text { text: "Iniciar Foco"; color: "#fffffe"; font.pixelSize: 14; font.bold: true }
                            Text { text: "Ciclo de 25 min com Lo-Fi"; color: "#a7a9be"; font.pixelSize: 11 }
                        }
                    }
                    MouseArea {
                        id: a3Mouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: homeRoot.navigateToTab("focus")
                    }
                }

                // Action 4: Hábitos Diários
                Rectangle {
                    Layout.fillWidth: true
                    height: 84
                    radius: 12
                    color: a4Mouse.containsMouse ? "#201e30" : "#1a1924"
                    border.color: a4Mouse.containsMouse ? "#f59e0b80" : "#ffffff0f"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 12
                        Rectangle {
                            width: 44; height: 44; radius: 10; color: "#f59e0b26"
                            Text { anchors.centerIn: parent; text: "⚡"; font.pixelSize: 20 }
                        }
                        ColumnLayout {
                            spacing: 2
                            Text { text: "Hábitos do Dia"; color: "#fffffe"; font.pixelSize: 14; font.bold: true }
                            Text { text: homeRoot.habits.length + " hábitos na rotina"; color: "#a7a9be"; font.pixelSize: 11 }
                        }
                    }
                    MouseArea {
                        id: a4Mouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: homeRoot.navigateToTab("habits")
                    }
                }
            }

            // Two-column Main Dashboard Layout
            RowLayout {
                Layout.fillWidth: true
                spacing: 20
                Layout.alignment: Qt.AlignTop

                // =============================================================
                // Left Column (Agenda & Financials)
                // =============================================================
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.preferredWidth: 640
                    spacing: 20

                    // Agenda Section
                    Rectangle {
                        Layout.fillWidth: true
                        radius: 14
                        color: "#1a1924"
                        border.color: "#ffffff0f"
                        border.width: 1

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 20
                            spacing: 14

                            RowLayout {
                                Layout.fillWidth: true
                                Text { text: "📅 Agenda de Hoje & Próximos Compromissos"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: "Ver Calendário →"
                                    color: "#38bdf8"
                                    font.pixelSize: 12
                                    font.bold: true
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: homeRoot.navigateToTab("calendar")
                                    }
                                }
                            }

                            // Events List
                            Repeater {
                                model: homeRoot.todayEvents.length > 0 ? homeRoot.todayEvents : (homeRoot.tomorrowEvents.length > 0 ? homeRoot.tomorrowEvents : [])
                                delegate: Rectangle {
                                    Layout.fillWidth: true
                                    height: 52
                                    radius: 8
                                    color: "#15141b"
                                    border.color: "#ffffff0a"

                                    RowLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 12

                                        Rectangle {
                                            width: 4; height: 28; radius: 2
                                            color: modelData.color || "#3b82f6"
                                        }

                                        ColumnLayout {
                                            Layout.fillWidth: true
                                            spacing: 2
                                            Text {
                                                text: modelData.title
                                                color: "#fffffe"
                                                font.pixelSize: 13
                                                font.bold: true
                                                elide: Text.ElideRight
                                            }
                                            Text {
                                                text: modelData.start_date ? Qt.formatDateTime(new Date(modelData.start_date), "hh:mm") + (modelData.description ? " • " + modelData.description : "") : "Hoje"
                                                color: "#a7a9be"
                                                font.pixelSize: 11
                                                elide: Text.ElideRight
                                            }
                                        }

                                        Rectangle {
                                            width: 72; height: 22; radius: 6
                                            color: modelData.status === "completed" ? "#10b98126" : "#3b82f626"
                                            Text {
                                                anchors.centerIn: parent
                                                text: modelData.status === "completed" ? "Concluído" : "Pendente"
                                                color: modelData.status === "completed" ? "#34d399" : "#60a5fa"
                                                font.pixelSize: 10
                                                font.bold: true
                                            }
                                        }
                                    }
                                }
                            }

                            Text {
                                visible: homeRoot.todayEvents.length === 0 && homeRoot.tomorrowEvents.length === 0
                                text: "Nenhum compromisso agendado para hoje. Aproveite para focar nos estudos!"
                                color: "#64748b"
                                font.pixelSize: 13
                            }
                        }
                    }

                    // Financial Snapshot Section
                    Rectangle {
                        Layout.fillWidth: true
                        radius: 14
                        color: "#1a1924"
                        border.color: "#ffffff0f"
                        border.width: 1

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 20
                            spacing: 14

                            RowLayout {
                                Layout.fillWidth: true
                                Text { text: "💰 Visão Financeira Rápida"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: "Ver Finanças →"
                                    color: "#10b981"
                                    font.pixelSize: 12
                                    font.bold: true
                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: homeRoot.navigateToTab("finance")
                                    }
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 12

                                // Receitas
                                Rectangle {
                                    Layout.fillWidth: true; height: 64; radius: 8; color: "#15141b"
                                    ColumnLayout { anchors.fill: parent; anchors.margins: 10; spacing: 2
                                        Text { text: "RECEITAS"; color: "#a7a9be"; font.pixelSize: 9; font.bold: true }
                                        Text { text: "R$ " + Number(homeRoot.financialSummary.income || 0).toFixed(2); color: "#34d399"; font.pixelSize: 15; font.bold: true }
                                    }
                                }

                                // Despesas
                                Rectangle {
                                    Layout.fillWidth: true; height: 64; radius: 8; color: "#15141b"
                                    ColumnLayout { anchors.fill: parent; anchors.margins: 10; spacing: 2
                                        Text { text: "DESPESAS"; color: "#a7a9be"; font.pixelSize: 9; font.bold: true }
                                        Text { text: "R$ " + Number(homeRoot.financialSummary.expense || 0).toFixed(2); color: "#f43f5e"; font.pixelSize: 15; font.bold: true }
                                    }
                                }

                                // Saldo Líquido
                                Rectangle {
                                    Layout.fillWidth: true; height: 64; radius: 8; color: "#15141b"
                                    ColumnLayout { anchors.fill: parent; anchors.margins: 10; spacing: 2
                                        Text { text: "SALDO LÍQUIDO"; color: "#a7a9be"; font.pixelSize: 9; font.bold: true }
                                        Text { text: "R$ " + Number(homeRoot.financialSummary.balance || 0).toFixed(2); color: "#fffffe"; font.pixelSize: 15; font.bold: true }
                                    }
                                }
                            }
                        }
                    }
                }

                // =============================================================
                // Right Column (Pinned & Recent Pages)
                // =============================================================
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.preferredWidth: 440
                    spacing: 20

                    // Pinned Pages Card
                    Rectangle {
                        Layout.fillWidth: true
                        radius: 14
                        color: "#1a1924"
                        border.color: "#ffffff0f"
                        border.width: 1

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 20
                            spacing: 12

                            Text { text: "📌 Notas Fixadas"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }

                            Repeater {
                                model: homeRoot.pinnedPages.slice(0, 6)
                                delegate: Rectangle {
                                    Layout.fillWidth: true
                                    height: 38
                                    radius: 8
                                    color: pinMouse.containsMouse ? "#201e30" : "#15141b"
                                    border.color: pinMouse.containsMouse ? "#8b5cf644" : "transparent"

                                    RowLayout {
                                        anchors.fill: parent
                                        anchors.margins: 10
                                        spacing: 10
                                        Text { text: modelData.icon || "📄"; font.pixelSize: 13 }
                                        Text {
                                            text: modelData.title || "Sem título"
                                            color: "#fffffe"
                                            font.pixelSize: 12
                                            font.bold: true
                                            elide: Text.ElideRight
                                            Layout.fillWidth: true
                                        }
                                    }
                                    MouseArea {
                                        id: pinMouse
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            homeRoot.navigateToTab("notes")
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Recently Modified Pages Card
                    Rectangle {
                        Layout.fillWidth: true
                        radius: 14
                        color: "#1a1924"
                        border.color: "#ffffff0f"
                        border.width: 1

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 20
                            spacing: 12

                            Text { text: "🕒 Notas Recentes"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }

                            Repeater {
                                model: homeRoot.recentPages
                                delegate: Rectangle {
                                    Layout.fillWidth: true
                                    height: 38
                                    radius: 8
                                    color: recMouse.containsMouse ? "#201e30" : "#15141b"
                                    border.color: recMouse.containsMouse ? "#8b5cf644" : "transparent"

                                    RowLayout {
                                        anchors.fill: parent
                                        anchors.margins: 10
                                        spacing: 10
                                        Text { text: modelData.icon || "📄"; font.pixelSize: 13 }
                                        Text {
                                            text: modelData.title || "Sem título"
                                            color: "#a7a9be"
                                            font.pixelSize: 12
                                            elide: Text.ElideRight
                                            Layout.fillWidth: true
                                        }
                                        Text {
                                            text: modelData.updated_at ? modelData.updated_at.substring(0, 10) : ""
                                            color: "#64748b"
                                            font.pixelSize: 10
                                        }
                                    }
                                    MouseArea {
                                        id: recMouse
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            homeRoot.navigateToTab("notes")
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Item { height: 24 } // Bottom padding
        }
    }
}
