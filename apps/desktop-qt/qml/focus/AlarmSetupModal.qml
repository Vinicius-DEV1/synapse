import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: alarmModalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 97

    signal saveAlarm(string timeStr, string label, string sound, string days)
    signal closed()

    property var selectedDays: ["1", "2", "3", "4", "5"]

    MouseArea {
        anchors.fill: parent
        onClicked: alarmModalRoot.closed()
    }

    Rectangle {
        width: Math.min(460, parent.width - 40)
        height: Math.min(480, parent.height - 40)
        radius: 20
        color: "#161524"
        border.color: "#338b5cf6"
        border.width: 1
        anchors.centerIn: parent

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: "🔔 Configurar Alarme"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    flat: true
                    onClicked: alarmModalRoot.closed()
                    contentItem: Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                    }
                }
            }

            // Time Selector (Hour & Minute)
            Rectangle {
                Layout.fillWidth: true
                height: 90
                radius: 12
                color: "#0f0e17"
                border.color: "#1affffff"
                border.width: 1

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 12

                    SpinBox {
                        id: hourBox
                        from: 0
                        to: 23
                        value: 8
                        editable: true
                        textFromValue: function(value) {
                            return (value < 10 ? "0" : "") + value
                        }
                    }

                    Text {
                        text: ":"
                        color: "#fffffe"
                        font.pixelSize: 28
                        font.bold: true
                    }

                    SpinBox {
                        id: minuteBox
                        from: 0
                        to: 59
                        value: 0
                        editable: true
                        textFromValue: function(value) {
                            return (value < 10 ? "0" : "") + value
                        }
                    }
                }
            }

            // Label Input
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6

                Text {
                    text: "RÓTULO DO ALARME"
                    color: "#a7a9be"
                    font.pixelSize: 11
                    font.bold: true
                }

                TextField {
                    id: labelInput
                    Layout.fillWidth: true
                    height: 40
                    placeholderText: "Ex: Revisão diária de flashcards..."
                    text: "Estudo Focado"
                    color: "#fffffe"
                    background: Rectangle {
                        color: "#0f0e17"
                        radius: 8
                        border.color: labelInput.activeFocus ? "#8b5cf6" : "#2e2f3e"
                        border.width: 1
                    }
                }
            }

            // Days of Week Selection
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6

                Text {
                    text: "DIAS DA SEMANA"
                    color: "#a7a9be"
                    font.pixelSize: 11
                    font.bold: true
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    Repeater {
                        model: [
                            { id: "1", label: "Seg" },
                            { id: "2", label: "Ter" },
                            { id: "3", label: "Qua" },
                            { id: "4", label: "Qui" },
                            { id: "5", label: "Sex" },
                            { id: "6", label: "Sáb" },
                            { id: "0", label: "Dom" }
                        ]
                        delegate: Rectangle {
                            Layout.fillWidth: true
                            height: 32
                            radius: 8
                            readonly property bool isSelected: alarmModalRoot.selectedDays.indexOf(modelData.id) !== -1
                            color: isSelected ? "#8b5cf6" : "#211f30"
                            border.color: isSelected ? "#8b5cf6" : "#33ffffff"
                            border.width: 1

                            Text {
                                anchors.centerIn: parent
                                text: modelData.label
                                color: parent.isSelected ? "#ffffff" : "#a7a9be"
                                font.pixelSize: 11
                                font.bold: true
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    var arr = alarmModalRoot.selectedDays.slice(0)
                                    var idx = arr.indexOf(modelData.id)
                                    if (idx !== -1) arr.splice(idx, 1)
                                    else arr.push(modelData.id)
                                    alarmModalRoot.selectedDays = arr
                                }
                            }
                        }
                    }
                }
            }

            Item { Layout.fillHeight: true }

            // Action Buttons
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    Layout.fillWidth: true
                    height: 44
                    flat: true
                    background: Rectangle {
                        color: "#211f30"
                        radius: 10
                        border.color: "#33ffffff"
                        border.width: 1
                    }
                    contentItem: Text {
                        text: "Cancelar"
                        color: "#a7a9be"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: alarmModalRoot.closed()
                }

                Button {
                    Layout.fillWidth: true
                    height: 44
                    flat: true
                    background: Rectangle {
                        color: "#8b5cf6"
                        radius: 10
                    }
                    contentItem: Text {
                        text: "Salvar Alarme"
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: {
                        var h = (hourBox.value < 10 ? "0" : "") + hourBox.value
                        var m = (minuteBox.value < 10 ? "0" : "") + minuteBox.value
                        var timeStr = h + ":" + m
                        var label = labelInput.text.trim() || "Estudo Focado"
                        var days = alarmModalRoot.selectedDays.join(",")
                        alarmModalRoot.saveAlarm(timeStr, label, "beep", days)
                        alarmModalRoot.closed()
                    }
                }
            }
        }
    }
}
