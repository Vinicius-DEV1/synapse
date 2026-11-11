import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: agendaRoot
    Layout.fillWidth: true
    Layout.preferredWidth: 620
    spacing: 20

    property var todayEvents: []
    property var tomorrowEvents: []

    signal viewCalendarRequested()

    // 1. Today's Events Card (Matching Image 1 & HomeAgendaSection.tsx)
    Rectangle {
        Layout.fillWidth: true
        implicitHeight: todayCol.implicitHeight + 44
        radius: 16
        color: theme.bgDarkCard
        border.color: theme.borderCard
        border.width: 1

        ColumnLayout {
            id: todayCol
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.margins: 22
            spacing: 16

            // Header Row: Amber Calendar Icon + Eventos de Hoje + [0 eventos] Pill
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Rectangle {
                    width: 34; height: 34; radius: 8
                    color: "#20f59e0b"
                    Text { anchors.centerIn: parent; text: "📅"; font.pixelSize: 15 }
                }

                Text {
                    text: "Eventos de Hoje"
                    color: "#ffffff"
                    font.pixelSize: 16
                    font.bold: true
                    font.family: theme.fontFamily
                }

                Item { Layout.fillWidth: true }

                // Count Pill Badge (e.g. 0 eventos)
                Rectangle {
                    height: 24
                    width: Math.max(76, eventCountText.contentWidth + 16)
                    radius: 12
                    color: "#1af59e0b"
                    border.color: "#33f59e0b"
                    border.width: 1

                    Text {
                        id: eventCountText
                        anchors.centerIn: parent
                        text: agendaRoot.todayEvents.length + (agendaRoot.todayEvents.length === 1 ? " evento" : " eventos")
                        color: "#fbbf24"
                        font.pixelSize: 11
                        font.bold: true
                        font.family: theme.fontFamily
                    }
                }
            }

            // Empty State (Matching Image 1: Watermark & "Sua agenda está livre para hoje!")
            Rectangle {
                visible: agendaRoot.todayEvents.length === 0
                Layout.fillWidth: true
                implicitHeight: 120
                radius: 12
                color: "#03ffffff"
                border.color: "#0affffff"
                border.width: 1

                ColumnLayout {
                    anchors.centerIn: parent
                    spacing: 8

                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "📅"
                        font.pixelSize: 28
                        opacity: 0.25
                    }

                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "Sua agenda está livre para hoje!"
                        color: theme.textMuted
                        font.pixelSize: 13
                        font.family: theme.fontFamily
                    }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: agendaRoot.viewCalendarRequested()
                }
            }

            // Events List when events exist
            ColumnLayout {
                visible: agendaRoot.todayEvents.length > 0
                Layout.fillWidth: true
                spacing: 8

                Repeater {
                    model: agendaRoot.todayEvents

                    delegate: Rectangle {
                        Layout.fillWidth: true
                        height: 52
                        radius: 10
                        color: "#04ffffff"
                        border.color: "#0affffff"

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 12

                            Rectangle {
                                width: 3; height: 26; radius: 1.5
                                color: modelData.color || "#3b82f6"
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    text: modelData.title
                                    color: "#ffffff"
                                    font.pixelSize: 13
                                    font.bold: true
                                    font.family: theme.fontFamily
                                    elide: Text.ElideRight
                                }
                                Text {
                                    text: modelData.start_date ? Qt.formatDateTime(new Date(modelData.start_date), "hh:mm") : "Hoje"
                                    color: theme.textSubtext
                                    font.pixelSize: 11
                                    font.family: theme.fontFamily
                                }
                            }

                            Rectangle {
                                width: 72; height: 22; radius: 6
                                color: modelData.status === "completed" ? "#2610b981" : "#263b82f6"
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
            }
        }
    }

    // 2. Tomorrow's Events Card (Visible if tomorrow events exist)
    Rectangle {
        visible: agendaRoot.tomorrowEvents.length > 0
        Layout.fillWidth: true
        implicitHeight: tomorrowCol.implicitHeight + 40
        radius: 16
        color: theme.bgDarkCard
        border.color: theme.borderCard
        border.width: 1

        ColumnLayout {
            id: tomorrowCol
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.margins: 20
            spacing: 12

            Text {
                text: "Amanhã"
                color: theme.textSubtext
                font.pixelSize: 14
                font.bold: true
                font.family: theme.fontFamily
            }

            Repeater {
                model: agendaRoot.tomorrowEvents
                delegate: Rectangle {
                    Layout.fillWidth: true
                    height: 44
                    radius: 8
                    color: "#04ffffff"
                    border.color: "#08ffffff"

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 10

                        Text { text: "⏰"; font.pixelSize: 12 }
                        Text {
                            Layout.fillWidth: true
                            text: modelData.title
                            color: "#ffffff"
                            font.pixelSize: 12
                            font.family: theme.fontFamily
                            elide: Text.ElideRight
                        }
                    }
                }
            }
        }
    }
}
