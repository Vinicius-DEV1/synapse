import QtQuick 2.15
import QtQuick.Layouts 1.15

Item {
    id: listRoot
    Layout.fillWidth: true
    Layout.fillHeight: true

    property var habits: []
    property var last7Days: []
    property var logMap: ({})

    signal toggleCheckin(string habitId, string dateStr)
    signal deleteHabitRequested(string habitId)

    ListView {
        id: habitListView
        anchors.fill: parent
        clip: true
        model: listRoot.habits
        spacing: 12

        delegate: Rectangle {
            id: habitCardDelegate
            width: habitListView.width
            height: 84
            radius: 12
            color: cardMouse.containsMouse ? "#211f30" : "#1a1924"
            border.color: cardMouse.containsMouse ? "#10b98166" : "#ffffff0f"
            border.width: 1

            Behavior on color { ColorAnimation { duration: 150 } }
            Behavior on border.color { ColorAnimation { duration: 150 } }

            RowLayout {
                anchors.fill: parent
                anchors.margins: 16
                spacing: 16

                // Habit Icon Badge
                Rectangle {
                    width: 48; height: 48; radius: 12
                    color: modelData.color ? modelData.color + "26" : "#10b98126"
                    border.color: modelData.color ? modelData.color + "4d" : "#10b9814d"
                    border.width: 1

                    Text {
                        anchors.centerIn: parent
                        text: modelData.icon || "⭐"
                        font.pixelSize: 22
                    }
                }

                // Habit Title & Target
                ColumnLayout {
                    Layout.preferredWidth: 220
                    spacing: 3

                    Text {
                        text: modelData.title
                        color: "#fffffe"
                        font.pixelSize: 15
                        font.bold: true
                        elide: Text.ElideRight
                    }

                    Text {
                        text: "Meta: " + (modelData.target_days_per_week || 7) + " dias / semana"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }

                Item { Layout.fillWidth: true }

                // 7-Day Matrix Columns
                RowLayout {
                    spacing: 10

                    Repeater {
                        model: listRoot.last7Days

                        delegate: ColumnLayout {
                            id: dayColDelegate
                            spacing: 4
                            property bool isDone: listRoot.logMap[modelData.id + "_" + modelData.date] === true

                            Text {
                                Layout.alignment: Qt.AlignHCenter
                                text: modelData.name
                                color: modelData.isToday ? "#fffffe" : "#64748b"
                                font.pixelSize: 10
                                font.bold: modelData.isToday
                            }

                            Rectangle {
                                width: 32; height: 32; radius: 16
                                color: dayColDelegate.isDone ? (modelData.color || "#10b981") : (modelData.isToday ? "#211f30" : "#15141b")
                                border.color: dayColDelegate.isDone ? (modelData.color || "#10b981") : (modelData.isToday ? "#ffffff25" : "#ffffff10")
                                border.width: modelData.isToday ? 1.5 : 1

                                Text {
                                    anchors.centerIn: parent
                                    text: dayColDelegate.isDone ? "✓" : (modelData.isToday ? "○" : "")
                                    color: dayColDelegate.isDone ? "#ffffff" : "#a7a9be"
                                    font.pixelSize: 13
                                    font.bold: true
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: listRoot.toggleCheckin(modelData.id, modelData.date)
                                }
                            }
                        }
                    }
                }

                Item { width: 12 }

                // Delete Habit Button
                Rectangle {
                    width: 34; height: 34; radius: 8
                    color: delHabitMouse.containsMouse ? "#f43f5e26" : "transparent"
                    border.color: delHabitMouse.containsMouse ? "#f43f5e55" : "transparent"

                    Text {
                        anchors.centerIn: parent
                        text: "🗑️"
                        font.pixelSize: 13
                    }

                    MouseArea {
                        id: delHabitMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: listRoot.deleteHabitRequested(modelData.id)
                    }
                }
            }

            MouseArea {
                id: cardMouse
                anchors.fill: parent
                hoverEnabled: true
                z: -1
            }
        }

        Text {
            anchors.centerIn: parent
            visible: listRoot.habits.length === 0
            text: "Nenhum hábito cadastrado ainda.\nClique em '+ Novo Hábito' para iniciar sua rotina!"
            color: "#64748b"
            font.pixelSize: 15
            horizontalAlignment: Text.AlignHCenter
        }
    }
}
