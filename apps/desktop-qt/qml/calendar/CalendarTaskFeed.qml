import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

ScrollView {
    id: feedRoot
    Layout.fillWidth: true
    Layout.fillHeight: true
    clip: true

    property var events: []

    signal editRequested(var eventData)
    signal toggleStatusRequested(string eventId, string currentStatus)

    ListView {
        id: feedList
        width: feedRoot.width
        model: feedRoot.events
        spacing: 8

        delegate: Rectangle {
            width: feedList.width
            height: 60
            radius: 10
            color: "#161524"
            border.color: modelData.color ? modelData.color + "4d" : "#2e2b44"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 12

                // Status Checkbox
                CheckBox {
                    checked: modelData.status === "completed"
                    onClicked: feedRoot.toggleStatusRequested(modelData.id, modelData.status)
                }

                // Type Icon / Color pill
                Rectangle {
                    width: 4
                    height: 32
                    radius: 2
                    color: modelData.color || "#38bdf8"
                }

                // Title & Subtitle
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2

                    Text {
                        text: modelData.title || ""
                        color: modelData.status === "completed" ? "#64748b" : "#fffffe"
                        font.pixelSize: 13
                        font.bold: true
                        font.strikeout: modelData.status === "completed"
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }

                    Text {
                        text: (modelData.start_date || "") + " • " + (modelData.event_type || "evento")
                        color: "#94a1b2"
                        font.pixelSize: 10
                    }
                }

                Button {
                    text: "Editar"
                    background: Rectangle { color: "#232135"; radius: 6 }
                    contentItem: Text { text: parent.text; color: "#38bdf8"; font.pixelSize: 11; font.bold: true }
                    onClicked: feedRoot.editRequested(modelData)
                }
            }
        }

        Text {
            anchors.centerIn: parent
            text: "Nenhuma tarefa ou evento encontrado."
            color: "#64748b"
            font.pixelSize: 13
            visible: feedList.count === 0
        }
    }
}
