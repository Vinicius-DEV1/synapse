import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: alarmsRoot
    anchors.fill: parent
    color: "#0f0e17" // bg-dark-bg

    property var alarms: []

    signal backRequested()
    signal newAlarmRequested()
    signal toggleAlarmRequested(string alarmId)
    signal deleteAlarmRequested(string alarmId)

    ScrollView {
        anchors.fill: parent
        contentWidth: parent.width
        clip: true

        ColumnLayout {
            width: Math.min(840, parent.width - 48)
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: 24

            Item { height: 16 }

            // Header Bar
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    width: 36
                    height: 36
                    flat: true
                    background: Rectangle {
                        color: "#161524"
                        radius: 18
                        border.color: "#1affffff"
                        border.width: 1
                    }
                    contentItem: Text {
                        text: "←"
                        color: "#fffffe"
                        font.pixelSize: 16
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: alarmsRoot.backRequested()
                }

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "🔔 Alarmes e Lembretes de Estudo"
                        color: "#fffffe"
                        font.pixelSize: 20
                        font.bold: true
                    }
                    Text {
                        text: "Configure alertas sonoros para seus horários de revisão"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    height: 38
                    flat: true
                    background: Rectangle {
                        color: "#8b5cf6"
                        radius: 10
                    }
                    contentItem: Text {
                        text: "+ Novo Alarme"
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: 14
                        rightPadding: 14
                    }
                    onClicked: alarmsRoot.newAlarmRequested()
                }
            }

            // Alarms Grid / List
            GridLayout {
                Layout.fillWidth: true
                columns: Math.max(1, Math.floor(parent.width / 260))
                rowSpacing: 16
                columnSpacing: 16

                Repeater {
                    model: alarmsRoot.alarms
                    delegate: Rectangle {
                        Layout.fillWidth: true
                        height: 120
                        radius: 16
                        color: (modelData.enabled === 1 || modelData.is_active === true) ? "#161524" : "#11101b"
                        border.color: (modelData.enabled === 1 || modelData.is_active === true) ? "#338b5cf6" : "#0fffffff"
                        border.width: 1

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 16
                            spacing: 8

                            RowLayout {
                                Layout.fillWidth: true

                                Text {
                                    text: modelData.time || modelData.time_str || "08:00"
                                    color: (modelData.enabled === 1 || modelData.is_active === true) ? "#ffffff" : "#6b7280"
                                    font.pixelSize: 32
                                    font.bold: true
                                    font.family: "Monospace"
                                }

                                Item { Layout.fillWidth: true }

                                Switch {
                                    checked: modelData.enabled === 1 || modelData.is_active === true
                                    onToggled: alarmsRoot.toggleAlarmRequested(String(modelData.id))
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true

                                Text {
                                    text: modelData.label || "Alarme de Estudo"
                                    color: "#a7a9be"
                                    font.pixelSize: 13
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }

                                Button {
                                    width: 28
                                    height: 28
                                    flat: true
                                    background: Rectangle {
                                        color: "transparent"
                                        radius: 6
                                    }
                                    contentItem: Text {
                                        text: "🗑"
                                        color: "#f87171"
                                        font.pixelSize: 13
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                    onClicked: alarmsRoot.deleteAlarmRequested(String(modelData.id))
                                }
                            }
                        }
                    }
                }
            }

            // Empty State
            Rectangle {
                Layout.fillWidth: true
                height: 160
                radius: 16
                color: "#161524"
                visible: alarmsRoot.alarms.length === 0
                border.color: "#1affffff"
                border.width: 1

                ColumnLayout {
                    anchors.centerIn: parent
                    spacing: 8

                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "⏰"
                        font.pixelSize: 32
                    }
                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "Nenhum alarme configurado"
                        color: "#fffffe"
                        font.pixelSize: 15
                        font.bold: true
                    }
                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "Clique em \"+ Novo Alarme\" para criar lembretes de estudo"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }
            }

            Item { height: 24 }
        }
    }
}
