import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: habitsRoot
    color: "#0f0e17" // bg-dark-bg

    property var habits: []
    property var last7Days: []
    property var logMap: ({})
    property bool isCreatingHabit: false
    property string selectedColor: "#10b981"
    property string selectedIcon: "⭐"
    property int selectedTargetDays: 7

    function computeDays() {
        var days = []
        var today = new Date()
        var dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
        for (var i = 6; i >= 0; i--) {
            var d = new Date(today.getTime() - i * 86400000)
            var iso = Qt.formatDate(d, "yyyy-MM-dd")
            var name = dayNames[d.getDay()]
            days.push({ date: iso, name: name, isToday: (i === 0) })
        }
        last7Days = days
    }

    function refreshHabits() {
        computeDays()
        habits = dataController.getHabits()
        if (last7Days.length > 0) {
            var startDate = last7Days[0].date
            var endDate = last7Days[last7Days.length - 1].date
            var logs = dataController.getHabitLogsRange(startDate, endDate)
            var map = {}
            for (var i = 0; i < logs.length; i++) {
                var key = logs[i].habit_id + "_" + logs[i].date
                map[key] = true
            }
            logMap = map
        }
    }

    function toggleHabitCheckin(habitId, dateStr) {
        dataController.toggleHabitCheckin(habitId, dateStr)
        refreshHabits()
    }

    function deleteHabit(habitId) {
        dataController.deleteHabit(habitId)
        refreshHabits()
    }

    Component.onCompleted: {
        refreshHabits()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        // Header and Actions
        RowLayout {
            Layout.fillWidth: true
            spacing: 16

            ColumnLayout {
                spacing: 4
                Text {
                    text: "⚡ Hábitos & Consistência Diária"
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
                Text {
                    text: habitsRoot.habits.length + " hábito(s) ativos • Matriz de ofensiva dos últimos 7 dias"
                    color: "#a7a9be"
                    font.pixelSize: 13
                }
            }

            Item { Layout.fillWidth: true }

            Rectangle {
                width: 144; height: 40; radius: 10
                color: "#10b981" // emerald-600

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Novo Hábito"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    hoverEnabled: true
                    onEntered: parent.color = "#059669"
                    onExited: parent.color = "#10b981"
                    onClicked: {
                        newHabitTitle.text = ""
                        habitsRoot.selectedColor = "#10b981"
                        habitsRoot.selectedIcon = "⭐"
                        habitsRoot.selectedTargetDays = 7
                        habitsRoot.isCreatingHabit = true
                    }
                }
            }
        }

        // Habits List
        ListView {
            id: habitListView
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            model: habitsRoot.habits
            spacing: 12

            delegate: Rectangle {
                id: habitCardDelegate
                width: habitListView.width
                height: 84
                radius: 12
                color: cardMouse.containsMouse ? "#211f30" : "#1a1924" // bg-dark-card
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
                            model: habitsRoot.last7Days

                            delegate: ColumnLayout {
                                id: dayColDelegate
                                spacing: 4
                                property bool isDone: habitsRoot.logMap[modelData.id + "_" + modelData.date] === true

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
                                        onClicked: habitsRoot.toggleHabitCheckin(modelData.id, modelData.date)
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
                            onClicked: habitsRoot.deleteHabit(modelData.id)
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
                visible: habitsRoot.habits.length === 0
                text: "Nenhum hábito cadastrado ainda.\nClique em '+ Novo Hábito' para iniciar sua rotina!"
                color: "#64748b"
                font.pixelSize: 15
                horizontalAlignment: Text.AlignHCenter
            }
        }
    }

    // ===================================================================
    // Modal: Novo Hábito
    // ===================================================================
    Rectangle {
        anchors.fill: parent
        color: "#00000088"
        visible: habitsRoot.isCreatingHabit
        z: 95

        MouseArea {
            anchors.fill: parent
            onClicked: habitsRoot.isCreatingHabit = false
        }

        Rectangle {
            anchors.centerIn: parent
            width: 460
            height: 440
            radius: 16
            color: "#161524"
            border.color: "#ffffff14"
            border.width: 1

            MouseArea {
                anchors.fill: parent
            }

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 28
                spacing: 16

                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "⚡ Novo Hábito Diário"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: habitsRoot.isCreatingHabit = false
                        }
                    }
                }

                // Title Input
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Nome do Hábito"; color: "#a7a9be"; font.pixelSize: 12 }
                    Rectangle {
                        Layout.fillWidth: true
                        height: 38
                        radius: 8
                        color: "#15141b"
                        border.color: newHabitTitle.activeFocus ? "#10b981" : "#ffffff15"
                        TextInput {
                            id: newHabitTitle
                            anchors.fill: parent
                            anchors.leftMargin: 12; anchors.rightMargin: 12
                            verticalAlignment: TextInput.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: 13
                            selectByMouse: true
                        }
                    }
                }

                // Emoji Icon Picker
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Ícone Representativo"; color: "#a7a9be"; font.pixelSize: 12 }
                    RowLayout {
                        spacing: 8
                        Repeater {
                            model: ["⭐", "📚", "💧", "🏃", "🧘", "💻", "🎨", "🎵"]
                            delegate: Rectangle {
                                width: 36; height: 36; radius: 8
                                color: habitsRoot.selectedIcon === modelData ? "#10b98133" : "#211f30"
                                border.color: habitsRoot.selectedIcon === modelData ? "#10b981" : "#ffffff10"
                                border.width: 1
                                Text { anchors.centerIn: parent; text: modelData; font.pixelSize: 18 }
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: habitsRoot.selectedIcon = modelData
                                }
                            }
                        }
                    }
                }

                // Color Picker
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Cor de Destaque"; color: "#a7a9be"; font.pixelSize: 12 }
                    RowLayout {
                        spacing: 10
                        Repeater {
                            model: ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#f43f5e", "#ec4899"]
                            delegate: Rectangle {
                                width: 28; height: 28; radius: 14
                                color: modelData
                                border.color: habitsRoot.selectedColor === modelData ? "#ffffff" : "transparent"
                                border.width: 2
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: habitsRoot.selectedColor = modelData
                                }
                            }
                        }
                    }
                }

                // Target Days / Week
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text { text: "Meta: " + habitsRoot.selectedTargetDays + " dias por semana"; color: "#a7a9be"; font.pixelSize: 12 }
                    RowLayout {
                        spacing: 8
                        Repeater {
                            model: [3, 4, 5, 6, 7]
                            delegate: Rectangle {
                                width: 44; height: 32; radius: 6
                                color: habitsRoot.selectedTargetDays === modelData ? "#10b981" : "#211f30"
                                Text {
                                    anchors.centerIn: parent
                                    text: modelData + "d"
                                    color: habitsRoot.selectedTargetDays === modelData ? "#ffffff" : "#a7a9be"
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: habitsRoot.selectedTargetDays = modelData
                                }
                            }
                        }
                    }
                }

                Item { Layout.fillHeight: true }

                // Actions Footer
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Item { Layout.fillWidth: true }
                    Rectangle {
                        width: 90; height: 38; radius: 8; color: "#211f30"
                        Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: habitsRoot.isCreatingHabit = false
                        }
                    }
                    Rectangle {
                        width: 120; height: 38; radius: 8; color: "#10b981"
                        Text { anchors.centerIn: parent; text: "Criar Hábito"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                if (newHabitTitle.text.trim().length > 0) {
                                    dataController.createHabit(newHabitTitle.text, habitsRoot.selectedColor, habitsRoot.selectedIcon, habitsRoot.selectedTargetDays)
                                    habitsRoot.isCreatingHabit = false
                                    habitsRoot.refreshHabits()
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
