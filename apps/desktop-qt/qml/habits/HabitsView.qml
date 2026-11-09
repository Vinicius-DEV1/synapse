import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: habitsRoot
    color: "#0f0e17" // bg-dark-bg

    property var habits: []
    property var currentDayLogs: ({})
    property string selectedDate: Qt.formatDate(new Date(), "yyyy-MM-dd")
    property bool isCreatingHabit: false

    function refreshHabits() {
        habits = dataController.getHabits()
        var logs = dataController.getHabitLogs(selectedDate)
        var map = {}
        for (var i = 0; i < logs.length; i++) {
            map[logs[i].habit_id] = true
        }
        currentDayLogs = map
    }

    function toggleHabit(habitId) {
        dataController.toggleHabitCheckin(habitId, selectedDate)
        refreshHabits()
    }

    Component.onCompleted: {
        refreshHabits()
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
                    text: "⚡ Hábitos & Consistência Diária"
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
                Text {
                    text: "Acompanhamento diário sem perda de dados • Data de hoje: " + habitsRoot.selectedDate
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
                    Text { text: "Novo Hábito"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: habitsRoot.isCreatingHabit = true
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
                width: habitListView.width
                height: 76
                radius: 12
                color: "#1a1924" // bg-dark-card
                border.color: habitsRoot.currentDayLogs[modelData.id] ? "#10b98144" : "#ffffff0f"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 18
                    spacing: 18

                    // Habit Icon Container
                    Rectangle {
                        width: 44; height: 44; radius: 10
                        color: modelData.color ? modelData.color + "26" : "#7c3aed26"
                        border.color: modelData.color ? modelData.color + "4d" : "#7c3aed4d"

                        Text {
                            anchors.centerIn: parent
                            text: modelData.icon || "⭐"
                            font.pixelSize: 20
                        }
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 3

                        Text {
                            text: modelData.title
                            color: "#fffffe"
                            font.pixelSize: 15
                            font.bold: true
                        }

                        Text {
                            text: "Meta semanal: " + (modelData.target_days_per_week || 7) + " dias"
                            color: "#a7a9be"
                            font.pixelSize: 12
                        }
                    }

                    // Check-in Circle Button
                    Rectangle {
                        width: 38; height: 38; radius: 19
                        color: habitsRoot.currentDayLogs[modelData.id] ? "#10b981" : "#15141b"
                        border.color: habitsRoot.currentDayLogs[modelData.id] ? "#10b981" : "#ffffff22"
                        border.width: 1

                        Text {
                            anchors.centerIn: parent
                            text: habitsRoot.currentDayLogs[modelData.id] ? "✓" : ""
                            color: "#ffffff"
                            font.pixelSize: 16
                            font.bold: true
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: habitsRoot.toggleHabit(modelData.id)
                        }
                    }
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

    // Modal: Novo Hábito
    Rectangle {
        anchors.fill: parent
        color: "#b3000000"
        visible: habitsRoot.isCreatingHabit

        MouseArea { anchors.fill: parent }

        Rectangle {
            anchors.centerIn: parent
            width: 440
            height: 300
            radius: 16
            color: "#1a1924"
            border.color: "#ffffff1a"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 28
                spacing: 16

                Text {
                    text: "Novo Hábito Diário"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }

                TextField {
                    id: habitTitleInput
                    Layout.fillWidth: true
                    placeholderText: "Nome do hábito (ex: Estudar 30 min)..."
                }

                TextField {
                    id: habitIconInput
                    Layout.fillWidth: true
                    placeholderText: "Emoji do hábito (ex: 📚, 💧, 🏃)..."
                    text: "⭐"
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Button {
                        text: "Cancelar"
                        Layout.fillWidth: true
                        onClicked: habitsRoot.isCreatingHabit = false
                    }
                    Button {
                        text: "Salvar"
                        Layout.fillWidth: true
                        onClicked: {
                            if (habitTitleInput.text.trim().length > 0) {
                                dataController.createHabit(habitTitleInput.text, "#10b981", habitIconInput.text, 7)
                                habitTitleInput.text = ""
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
