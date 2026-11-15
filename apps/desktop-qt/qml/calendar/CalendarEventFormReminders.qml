import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

ColumnLayout {
    id: remindersRoot
    Layout.fillWidth: true
    spacing: 8

    property var selectedReminders: ["15m"] // default: 15 min antes

    readonly property var options: [
        { key: "0m", label: "No horário do evento" },
        { key: "5m", label: "5 minutos antes" },
        { key: "15m", label: "15 minutos antes" },
        { key: "30m", label: "30 minutos antes" },
        { key: "1h", label: "1 hora antes" },
        { key: "1d", label: "1 dia antes" }
    ]

    Text {
        text: "🔔 Lembretes do Evento:"
        color: "#d4d4d8"
        font.pixelSize: 12
        font.bold: true
    }

    // Selected Reminders Tags
    RowLayout {
        Layout.fillWidth: true
        spacing: 6

        Repeater {
            model: remindersRoot.selectedReminders

            Rectangle {
                Layout.preferredHeight: 26
                Layout.preferredWidth: rText.implicitWidth + 24
                radius: 13
                color: "#232135"
                border.color: "#38bdf8"
                border.width: 1

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 4

                    Text {
                        id: rText
                        text: {
                            for (var i = 0; i < remindersRoot.options.length; i++) {
                                if (remindersRoot.options[i].key === modelData) return remindersRoot.options[i].label
                            }
                            return modelData
                        }
                        color: "#38bdf8"
                        font.pixelSize: 11
                    }

                    Text {
                        text: "✕"
                        color: "#94a1b2"
                        font.pixelSize: 9
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: removeReminder(modelData)
                        }
                    }
                }
            }
        }

        // Add Reminder ComboBox
        ComboBox {
            id: addCombo
            Layout.preferredWidth: 150
            Layout.preferredHeight: 28
            model: ["+ Adicionar...", "No horário", "5 min antes", "15 min antes", "30 min antes", "1 hora antes", "1 dia antes"]
            currentIndex: 0
            onActivated: function(index) {
                if (index > 0) {
                    var keys = ["0m", "5m", "15m", "30m", "1h", "1d"]
                    addReminder(keys[index - 1])
                    currentIndex = 0
                }
            }
        }

        Item { Layout.fillWidth: true }
    }

    function addReminder(key) {
        if (selectedReminders.indexOf(key) === -1) {
            var arr = [...selectedReminders]
            arr.push(key)
            selectedReminders = arr
        }
    }

    function removeReminder(key) {
        var arr = selectedReminders.filter(function(k) { return k !== key })
        selectedReminders = arr
    }
}
