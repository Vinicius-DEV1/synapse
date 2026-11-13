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
    signal editHabitRequested(var habit)
    signal deleteHabitRequested(string habitId)

    ListView {
        id: habitListView
        anchors.fill: parent
        clip: true
        model: listRoot.habits
        spacing: 12

        delegate: Rectangle {
            id: habitCardDelegate
            property var habitItem: modelData
            width: habitListView.width
            height: 84
            radius: 12
            color: cardMouse.containsMouse ? "#211f30" : "#1a1924"
            border.color: cardMouse.containsMouse ? "#6610b981" : "#0fffffff"
            border.width: 1

            Behavior on color { ColorAnimation { duration: 150 } }
            Behavior on border.color { ColorAnimation { duration: 150 } }

            RowLayout {
                anchors.fill: parent
                anchors.margins: 16
                spacing: 16

                // Habit Icon Badge
                Rectangle {
                    Layout.preferredWidth: 48
                    Layout.preferredHeight: 48
                    radius: 12
                    color: habitCardDelegate.habitItem.color ? habitCardDelegate.habitItem.color + "26" : "#2610b981"
                    border.color: habitCardDelegate.habitItem.color ? habitCardDelegate.habitItem.color + "4d" : "#4d10b981"
                    border.width: 1

                    Text {
                        anchors.centerIn: parent
                        text: habitCardDelegate.habitItem.icon || "⭐"
                        font.pixelSize: 22
                    }
                }

                // Habit Title & Target
                ColumnLayout {
                    Layout.preferredWidth: 200
                    spacing: 3

                    Text {
                        text: habitCardDelegate.habitItem.title || ""
                        color: "#fffffe"
                        font.pixelSize: 15
                        font.bold: true
                        elide: Text.ElideRight
                        Layout.maximumWidth: 190
                    }

                    Text {
                        text: "Meta: " + (habitCardDelegate.habitItem.target_days_per_week || 7) + " dias / semana"
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
                            property var dayItem: modelData
                            spacing: 4
                            property bool isDone: listRoot.logMap[habitCardDelegate.habitItem.id + "_" + dayColDelegate.dayItem.date] === true

                            Text {
                                Layout.alignment: Qt.AlignHCenter
                                text: dayColDelegate.dayItem.name
                                color: dayColDelegate.dayItem.isToday ? "#fffffe" : "#64748b"
                                font.pixelSize: 10
                                font.bold: dayColDelegate.dayItem.isToday
                            }

                            Rectangle {
                                Layout.preferredWidth: 32
                                Layout.preferredHeight: 32
                                radius: 16
                                color: dayColDelegate.isDone ? (habitCardDelegate.habitItem.color || "#10b981") : (dayColDelegate.dayItem.isToday ? "#211f30" : "#15141b")
                                border.color: dayColDelegate.isDone ? (habitCardDelegate.habitItem.color || "#10b981") : (dayColDelegate.dayItem.isToday ? "#25ffffff" : "#10ffffff")
                                border.width: dayColDelegate.dayItem.isToday ? 1.5 : 1

                                Text {
                                    anchors.centerIn: parent
                                    text: dayColDelegate.isDone ? "✓" : (dayColDelegate.dayItem.isToday ? "○" : "")
                                    color: dayColDelegate.isDone ? "#ffffff" : "#a7a9be"
                                    font.pixelSize: 13
                                    font.bold: true
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: listRoot.toggleCheckin(habitCardDelegate.habitItem.id, dayColDelegate.dayItem.date)
                                }
                            }
                        }
                    }
                }

                Item { Layout.preferredWidth: 8 }

                // Edit Habit Button
                Rectangle {
                    Layout.preferredWidth: 32
                    Layout.preferredHeight: 32
                    radius: 8
                    color: editHabitMouse.containsMouse ? "#206366f1" : "transparent"
                    border.color: editHabitMouse.containsMouse ? "#556366f1" : "transparent"

                    Text {
                        anchors.centerIn: parent
                        text: "✏️"
                        font.pixelSize: 12
                    }

                    MouseArea {
                        id: editHabitMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: listRoot.editHabitRequested(habitCardDelegate.habitItem)
                    }
                }

                // Delete Habit Button
                Rectangle {
                    Layout.preferredWidth: 32
                    Layout.preferredHeight: 32
                    radius: 8
                    color: delHabitMouse.containsMouse ? "#26f43f5e" : "transparent"
                    border.color: delHabitMouse.containsMouse ? "#55f43f5e" : "transparent"

                    Text {
                        anchors.centerIn: parent
                        text: "🗑️"
                        font.pixelSize: 12
                    }

                    MouseArea {
                        id: delHabitMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: listRoot.deleteHabitRequested(habitCardDelegate.habitItem.id)
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
            visible: !listRoot.habits || listRoot.habits.length === 0
            text: "Nenhum hábito cadastrado ainda.\nClique em '+ Novo Hábito' para iniciar sua rotina!"
            color: "#64748b"
            font.pixelSize: 15
            horizontalAlignment: Text.AlignHCenter
        }
    }
}
