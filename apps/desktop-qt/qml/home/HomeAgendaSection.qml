import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: agendaRoot
    Layout.fillWidth: true
    Layout.preferredWidth: 640
    spacing: 20

    property var todayEvents: []
    property var tomorrowEvents: []
    property var financialSummary: ({})

    signal viewCalendarRequested()
    signal viewFinanceRequested()

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
                        onClicked: agendaRoot.viewCalendarRequested()
                    }
                }
            }

            // Events List
            Repeater {
                model: agendaRoot.todayEvents.length > 0 ? agendaRoot.todayEvents : (agendaRoot.tomorrowEvents.length > 0 ? agendaRoot.tomorrowEvents : [])
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
                visible: agendaRoot.todayEvents.length === 0 && agendaRoot.tomorrowEvents.length === 0
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
                        onClicked: agendaRoot.viewFinanceRequested()
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
                        Text { text: "R$ " + Number(agendaRoot.financialSummary.income || 0).toFixed(2); color: "#34d399"; font.pixelSize: 15; font.bold: true }
                    }
                }

                // Despesas
                Rectangle {
                    Layout.fillWidth: true; height: 64; radius: 8; color: "#15141b"
                    ColumnLayout { anchors.fill: parent; anchors.margins: 10; spacing: 2
                        Text { text: "DESPESAS"; color: "#a7a9be"; font.pixelSize: 9; font.bold: true }
                        Text { text: "R$ " + Number(agendaRoot.financialSummary.expense || 0).toFixed(2); color: "#f43f5e"; font.pixelSize: 15; font.bold: true }
                    }
                }

                // Saldo Líquido
                Rectangle {
                    Layout.fillWidth: true; height: 64; radius: 8; color: "#15141b"
                    ColumnLayout { anchors.fill: parent; anchors.margins: 10; spacing: 2
                        Text { text: "SALDO LÍQUIDO"; color: "#a7a9be"; font.pixelSize: 9; font.bold: true }
                        Text { text: "R$ " + Number(agendaRoot.financialSummary.balance || 0).toFixed(2); color: "#fffffe"; font.pixelSize: 15; font.bold: true }
                    }
                }
            }
        }
    }
}

