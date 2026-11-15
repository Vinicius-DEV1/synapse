import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: dayModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property string dateStr: ""
    property var dayEvents: []

    signal closeRequested()
    signal addEventRequested(string dateStr)
    signal eventClicked(var eventData)
    signal toggleStatusRequested(string eventId, string currentStatus)

    Shortcut {
        sequence: "Escape"
        enabled: dayModalRoot.visible
        onActivated: dayModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: dayModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 520)
        height: Math.min(parent.height - 48, 480)
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    width: 36
                    height: 36
                    radius: 8
                    color: "rgba(56, 189, 248, 0.15)"
                    Text { anchors.centerIn: parent; text: "📅"; font.pixelSize: 18 }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: "Agenda do Dia"
                        color: "#fffffe"
                        font.pixelSize: 17
                        font.bold: true
                    }
                    Text {
                        text: dayModalRoot.dateStr
                        color: "#38bdf8"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: dayModalRoot.closeRequested()
                }
            }

            // Events List
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 10
                color: "#11101a"
                border.color: "#2e2b44"

                ListView {
                    id: eventsList
                    anchors.fill: parent
                    anchors.margins: 10
                    clip: true
                    model: dayModalRoot.dayEvents
                    spacing: 8

                    delegate: Rectangle {
                        width: eventsList.width
                        height: 52
                        radius: 8
                        color: "#1a1829"
                        border.color: modelData.color ? modelData.color + "66" : "#2e2b44"

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 10

                            Rectangle {
                                width: 8
                                height: 8
                                radius: 4
                                color: modelData.color || "#3b82f6"
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2

                                Text {
                                    text: modelData.title || "Evento"
                                    color: modelData.status === "completed" ? "#94a1b2" : "#fffffe"
                                    font.pixelSize: 13
                                    font.bold: true
                                    font.strikeout: modelData.status === "completed"
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }

                                Text {
                                    text: (modelData.event_type ? modelData.event_type.toUpperCase() : "EVENTO") + (modelData.start_time ? (" • " + modelData.start_time.substring(11, 16)) : "")
                                    color: "#6b7280"
                                    font.pixelSize: 10
                                }
                            }

                            Button {
                                text: modelData.status === "completed" ? "✓ Feito" : "Concluir"
                                background: Rectangle {
                                    color: modelData.status === "completed" ? "#10b981" : "#232135"
                                    radius: 6
                                }
                                contentItem: Text {
                                    text: parent.text
                                    color: modelData.status === "completed" ? "#ffffff" : "#a7a9be"
                                    font.pixelSize: 10
                                    font.bold: true
                                }
                                onClicked: dayModalRoot.toggleStatusRequested(modelData.id, modelData.status)
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            z: -1
                            onClicked: {
                                dayModalRoot.eventClicked(modelData)
                                dayModalRoot.closeRequested()
                            }
                        }
                    }

                    Text {
                        anchors.centerIn: parent
                        text: "Nenhum evento agendado para este dia."
                        color: "#64748b"
                        font.pixelSize: 12
                        visible: dayModalRoot.dayEvents.length === 0
                    }
                }
            }

            // Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Item { Layout.fillWidth: true }

                Button {
                    text: "+ Adicionar Evento Neste Dia"
                    background: Rectangle { color: "#38bdf8"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#0f172a"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        dayModalRoot.addEventRequested(dayModalRoot.dateStr)
                        dayModalRoot.closeRequested()
                    }
                }
            }
        }
    }
}
