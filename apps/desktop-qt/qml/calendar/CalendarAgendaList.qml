import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ListView {
    id: eventListView
    Layout.fillWidth: true
    Layout.fillHeight: true
    clip: true
    spacing: 10

    property var events: []

    signal toggleStatusRequested(string eventId)
    signal deleteRequested(string eventId)
    signal editRequested(var eventData)

    model: events

    delegate: Rectangle {
        id: eventRowDelegate
        width: eventListView.width
        height: 72
        radius: 12
        color: rowMouse.containsMouse ? "#211f30" : "#1a1924" // bg-dark-card
        border.color: rowMouse.containsMouse ? "#663b82f6" : (modelData.status === "completed" ? "#2610b981" : "#0fffffff")
        border.width: 1

        Behavior on color { ColorAnimation { duration: 150 } }
        Behavior on border.color { ColorAnimation { duration: 150 } }

        RowLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 16

            // Left Colored Indicator Stripe
            Rectangle {
                width: 4
                height: 40
                radius: 2
                color: modelData.color || "#3b82f6"
            }

            // Event Details
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4

                Text {
                    text: modelData.title
                    color: modelData.status === "completed" ? "#64748b" : "#fffffe"
                    font.pixelSize: 15
                    font.bold: true
                    font.strikeout: modelData.status === "completed"
                    elide: Text.ElideRight
                }

                RowLayout {
                    spacing: 8
                    Text {
                        text: modelData.start_date ? Qt.formatDateTime(new Date(modelData.start_date), "dd/MM/yyyy às hh:mm") : "Sem data definida"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                    Text {
                        visible: (modelData.description || "").trim().length > 0
                        text: "•"
                        color: "#64748b"
                        font.pixelSize: 12
                    }
                    Text {
                        visible: (modelData.description || "").trim().length > 0
                        text: modelData.description || ""
                        color: "#a7a9be"
                        font.pixelSize: 12
                        elide: Text.ElideRight
                        Layout.maximumWidth: 400
                    }
                }
            }

            // Status Toggle Pill
            Rectangle {
                width: 110
                height: 32
                radius: 8
                color: modelData.status === "completed" ? "#1a10b981" : "#1a3b82f6"
                border.color: modelData.status === "completed" ? "#3310b981" : "#333b82f6"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text {
                        text: modelData.status === "completed" ? "✓" : "○"
                        color: modelData.status === "completed" ? "#34d399" : "#60a5fa"
                        font.pixelSize: 12
                    }
                    Text {
                        text: modelData.status === "completed" ? "Concluído" : "Pendente"
                        color: modelData.status === "completed" ? "#34d399" : "#60a5fa"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: eventListView.toggleStatusRequested(modelData.id)
                }
            }

            Row {
                spacing: 4
                Rectangle {
                    width: 32; height: 32; radius: 8
                    color: editMouse.containsMouse ? "#1a3b82f6" : "transparent"
                    Text { anchors.centerIn: parent; text: "✎"; color: "#a7a9be"; font.pixelSize: 14 }
                    MouseArea {
                        id: editMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: eventListView.editRequested(modelData)
                    }
                }
                Rectangle {
                    width: 32; height: 32; radius: 8
                    color: delMouse.containsMouse ? "#26f43f5e" : "transparent"
                    border.color: delMouse.containsMouse ? "#55f43f5e" : "transparent"
                    Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 12 }
                    MouseArea {
                        id: delMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: eventListView.deleteRequested(modelData.id)
                    }
                }
            }
        }

        MouseArea {
            id: rowMouse
            anchors.fill: parent
            hoverEnabled: true
            z: -1
        }
    }

    Text {
        anchors.centerIn: parent
        visible: eventListView.events.length === 0
        text: "Nenhum evento registrado nesta visualização."
        color: "#64748b"
        font.pixelSize: 15
    }
}
