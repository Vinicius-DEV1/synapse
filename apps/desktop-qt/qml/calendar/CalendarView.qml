import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: calendarRoot
    color: "#0f0e17" // bg-dark-bg

    property var events: []
    property bool isCreatingEvent: false

    function refreshEvents() {
        events = dataController.getCalendarEvents()
    }

    Component.onCompleted: {
        refreshEvents()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        // Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 16

            ColumnLayout {
                spacing: 4
                Text {
                    text: "📅 Calendário & Agenda de Compromissos"
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
                Text {
                    text: calendarRoot.events.length + " compromisso(s) e eventos sincronizados com o banco local"
                    color: "#a7a9be"
                    font.pixelSize: 13
                }
            }

            Item { Layout.fillWidth: true }

            Rectangle {
                width: 140; height: 38; radius: 10
                color: "#7c3aed" // brand-600

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Novo Evento"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: calendarRoot.isCreatingEvent = true
                }
            }
        }

        // Events ListView
        ListView {
            id: eventListView
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            model: calendarRoot.events
            spacing: 10

            delegate: Rectangle {
                width: eventListView.width
                height: 72
                radius: 12
                color: "#1a1924" // bg-dark-card
                border.color: eventCardMouse.containsMouse ? "#8b5cf64d" : (modelData.status === "completed" ? "#10b98133" : "#ffffff0f")
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 16

                    Rectangle {
                        width: 4
                        height: 40
                        radius: 2
                        color: modelData.color || "#3b82f6"
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 3

                        Text {
                            text: modelData.title
                            color: modelData.status === "completed" ? "#64748b" : "#fffffe"
                            font.pixelSize: 15
                            font.bold: true
                            font.strikeout: modelData.status === "completed"
                            elide: Text.ElideRight
                        }

                        Text {
                            text: (modelData.start_date ? Qt.formatDateTime(new Date(modelData.start_date), "dd/MM/yyyy às hh:mm") : "") + (modelData.description ? " • " + modelData.description : "")
                            color: "#a7a9be"
                            font.pixelSize: 12
                            elide: Text.ElideRight
                        }
                    }

                    // Status Toggle Pill
                    Rectangle {
                        width: 120
                        height: 32
                        radius: 8
                        color: modelData.status === "completed" ? "#10b9811a" : "#8b5cf61a"
                        border.color: modelData.status === "completed" ? "#10b98133" : "#8b5cf633"

                        Text {
                            anchors.centerIn: parent
                            text: modelData.status === "completed" ? "Concluído ✓" : "Pendente"
                            color: modelData.status === "completed" ? "#34d399" : "#c4b5fd"
                            font.pixelSize: 12
                            font.bold: true
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                dataController.toggleEventStatus(modelData.id)
                                calendarRoot.refreshEvents()
                            }
                        }
                    }
                }

                MouseArea {
                    id: eventCardMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    z: -1
                }
            }

            Text {
                anchors.centerIn: parent
                visible: calendarRoot.events.length === 0
                text: "Nenhum evento registrado na agenda."
                color: "#64748b"
                font.pixelSize: 15
            }
        }
    }

    // Modal: Novo Evento
    Rectangle {
        anchors.fill: parent
        color: "#b3000000"
        visible: calendarRoot.isCreatingEvent

        MouseArea { anchors.fill: parent }

        Rectangle {
            anchors.centerIn: parent
            width: 440
            height: 340
            radius: 16
            color: "#1a1924"
            border.color: "#ffffff1a"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 28
                spacing: 16

                Text {
                    text: "Novo Evento na Agenda"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }

                TextField {
                    id: eventTitleInput
                    Layout.fillWidth: true
                    placeholderText: "Título do compromisso (ex: Aula ao vivo)..."
                }

                TextField {
                    id: eventDescInput
                    Layout.fillWidth: true
                    placeholderText: "Descrição (opcional)..."
                }

                TextField {
                    id: eventDateInput
                    Layout.fillWidth: true
                    placeholderText: "Data de início..."
                    text: Qt.formatDateTime(new Date(), "yyyy-MM-ddThh:mm:ss")
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Button {
                        text: "Cancelar"
                        Layout.fillWidth: true
                        onClicked: calendarRoot.isCreatingEvent = false
                    }
                    Button {
                        text: "Salvar"
                        Layout.fillWidth: true
                        onClicked: {
                            if (eventTitleInput.text.trim().length > 0) {
                                dataController.createCalendarEvent(eventTitleInput.text, eventDescInput.text, eventDateInput.text, eventDateInput.text, "event", "#3b82f6")
                                eventTitleInput.text = ""
                                eventDescInput.text = ""
                                calendarRoot.isCreatingEvent = false
                                calendarRoot.refreshEvents()
                            }
                        }
                    }
                }
            }
        }
    }
}
