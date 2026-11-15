import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: settingsModalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 96

    property bool soundEnabled: true
    property string alarmType: "beep"
    property int dailyGoal: 120

    signal closed()
    signal clearHistoryRequested(string range)

    MouseArea {
        anchors.fill: parent
        onClicked: settingsModalRoot.closed()
    }

    Rectangle {
        width: Math.min(480, parent.width - 40)
        height: Math.min(520, parent.height - 40)
        radius: 20
        color: "#161524"
        border.color: "#338b5cf6"
        border.width: 1
        anchors.centerIn: parent

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 20

            // Header
            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: "⚙ Configurações de Foco"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    flat: true
                    onClicked: settingsModalRoot.closed()
                    contentItem: Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                    }
                }
            }

            // Sound Effects Section
            Rectangle {
                Layout.fillWidth: true
                height: 64
                radius: 12
                color: "#11101b"
                border.color: "#1affffff"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: 12

                    ColumnLayout {
                        spacing: 2
                        Text {
                            text: "Efeitos Sonoros"
                            color: "#ffffff"
                            font.pixelSize: 14
                            font.bold: true
                        }
                        Text {
                            text: "Tocar sinos ao concluir ou pausar pomodoros"
                            color: "#a7a9be"
                            font.pixelSize: 11
                        }
                    }

                    Item { Layout.fillWidth: true }

                    Switch {
                        id: soundSwitch
                        checked: settingsModalRoot.soundEnabled
                        onToggled: settingsModalRoot.soundEnabled = checked
                    }
                }
            }

            // Alarm Sound Type Selector
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8

                Text {
                    text: "SOM DO ALARME PADRÃO"
                    color: "#a7a9be"
                    font.pixelSize: 11
                    font.bold: true
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Repeater {
                        model: [
                            { id: "beep", label: "Beep" },
                            { id: "bell", label: "Sino" },
                            { id: "digital", label: "Digital" },
                            { id: "nature", label: "Natureza" }
                        ]
                        delegate: Button {
                            Layout.fillWidth: true
                            height: 36
                            flat: true
                            background: Rectangle {
                                color: settingsModalRoot.alarmType === modelData.id ? "#8b5cf6" : "#211f30"
                                radius: 8
                                border.color: settingsModalRoot.alarmType === modelData.id ? "#8b5cf6" : "#33ffffff"
                                border.width: 1
                            }
                            contentItem: Text {
                                text: modelData.label
                                color: settingsModalRoot.alarmType === modelData.id ? "#ffffff" : "#a7a9be"
                                font.pixelSize: 12
                                font.bold: true
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                            }
                            onClicked: settingsModalRoot.alarmType = modelData.id
                        }
                    }
                }
            }

            // Daily Goal
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "META DIÁRIA DE FOCO"
                        color: "#a7a9be"
                        font.pixelSize: 11
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: settingsModalRoot.dailyGoal + " minutos (" + (settingsModalRoot.dailyGoal / 60).toFixed(1) + "h)"
                        color: "#8b5cf6"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }

                Slider {
                    Layout.fillWidth: true
                    from: 30
                    to: 480
                    stepSize: 15
                    value: settingsModalRoot.dailyGoal
                    onMoved: settingsModalRoot.dailyGoal = Math.round(value)
                }
            }

            // Data Retention & Clear
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8

                Text {
                    text: "HISTÓRICO E RETENÇÃO"
                    color: "#a7a9be"
                    font.pixelSize: 11
                    font.bold: true
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Button {
                        Layout.fillWidth: true
                        height: 36
                        flat: true
                        background: Rectangle {
                            color: "#211f30"
                            radius: 8
                            border.color: "#33ffffff"
                            border.width: 1
                        }
                        contentItem: Text {
                            text: "Limpar Hoje"
                            color: "#f87171"
                            font.pixelSize: 11
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        onClicked: settingsModalRoot.clearHistoryRequested("today")
                    }

                    Button {
                        Layout.fillWidth: true
                        height: 36
                        flat: true
                        background: Rectangle {
                            color: "#211f30"
                            radius: 8
                            border.color: "#33ffffff"
                            border.width: 1
                        }
                        contentItem: Text {
                            text: "Últimos 7 Dias"
                            color: "#f87171"
                            font.pixelSize: 11
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        onClicked: settingsModalRoot.clearHistoryRequested("last7days")
                    }

                    Button {
                        Layout.fillWidth: true
                        height: 36
                        flat: true
                        background: Rectangle {
                            color: "#211f30"
                            radius: 8
                            border.color: "#33ffffff"
                            border.width: 1
                        }
                        contentItem: Text {
                            text: "Tudo"
                            color: "#f87171"
                            font.pixelSize: 11
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        onClicked: settingsModalRoot.clearHistoryRequested("all")
                    }
                }
            }

            Item { Layout.fillHeight: true }

            Button {
                Layout.fillWidth: true
                height: 44
                flat: true
                background: Rectangle {
                    color: "#8b5cf6"
                    radius: 10
                }
                contentItem: Text {
                    text: "Concluir"
                    color: "#ffffff"
                    font.pixelSize: 13
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: settingsModalRoot.closed()
            }
        }
    }
}
