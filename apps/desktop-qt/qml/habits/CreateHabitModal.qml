import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#88000000"
    z: 95
    visible: false

    property var editingHabit: null
    readonly property bool isEditing: editingHabit !== null && editingHabit !== undefined
    property string selectedColor: "#10b981"
    property string selectedIcon: "⭐"
    property int selectedTargetDays: 7

    signal closed()
    signal habitSubmitted(string title, string color, string icon, int targetDays)
    signal habitUpdated(string habitId, string title, string color, string icon, int targetDays)

    function openModal(habit) {
        editingHabit = habit || null
        if (habit) {
            newHabitTitle.text = habit.title || ""
            selectedColor = habit.color || "#10b981"
            selectedIcon = habit.icon || "⭐"
            selectedTargetDays = habit.target_days_per_week || 7
        } else {
            newHabitTitle.text = ""
            selectedColor = "#10b981"
            selectedIcon = "⭐"
            selectedTargetDays = 7
        }
        modalRoot.visible = true
        newHabitTitle.forceActiveFocus()
    }

    function closeModal() {
        modalRoot.visible = false
        editingHabit = null
        modalRoot.closed()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: modalRoot.closeModal()
    }

    Rectangle {
        anchors.centerIn: parent
        width: 460
        height: 440
        radius: 16
        color: "#161524"
        border.color: "#14ffffff"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 28
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: modalRoot.isEditing ? "✏️ Editar Hábito" : "⚡ Novo Hábito Diário"
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Text {
                    text: "✕"
                    color: "#a7a9be"
                    font.pixelSize: 16
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: modalRoot.closeModal()
                    }
                }
            }

            // Title Input
            ColumnLayout {
                Layout.fillWidth: true; spacing: 6
                Text { text: "Nome do Hábito"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true; height: 38; radius: 8; color: "#15141b"
                    border.color: newHabitTitle.activeFocus ? "#10b981" : "#15ffffff"
                    TextInput {
                        id: newHabitTitle
                        anchors.fill: parent; anchors.leftMargin: 12; anchors.rightMargin: 12
                        verticalAlignment: TextInput.AlignVCenter; color: "#fffffe"; font.pixelSize: 13; selectByMouse: true
                    }
                }
            }

            // Emoji Icon Picker
            ColumnLayout {
                Layout.fillWidth: true; spacing: 6
                Text { text: "Ícone Representativo"; color: "#a7a9be"; font.pixelSize: 12 }
                RowLayout {
                    spacing: 8
                    Repeater {
                        model: ["⭐", "📚", "💧", "🏃", "🧘", "💻", "🎨", "🎵"]
                        delegate: Rectangle {
                            id: iconRect
                            property var iconData: modelData
                            Layout.preferredWidth: 36
                            Layout.preferredHeight: 36
                            radius: 8
                            color: modalRoot.selectedIcon === iconRect.iconData ? "#3310b981" : "#211f30"
                            border.color: modalRoot.selectedIcon === iconRect.iconData ? "#10b981" : "#10ffffff"
                            border.width: 1
                            Text { anchors.centerIn: parent; text: iconRect.iconData; font.pixelSize: 18 }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: modalRoot.selectedIcon = iconRect.iconData
                            }
                        }
                    }
                }
            }

            // Color Picker
            ColumnLayout {
                Layout.fillWidth: true; spacing: 6
                Text { text: "Cor de Destaque"; color: "#a7a9be"; font.pixelSize: 12 }
                RowLayout {
                    spacing: 10
                    Repeater {
                        model: ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#f43f5e", "#ec4899"]
                        delegate: Rectangle {
                            id: colorRect
                            property var colorData: modelData
                            Layout.preferredWidth: 28
                            Layout.preferredHeight: 28
                            radius: 14
                            color: colorRect.colorData
                            border.color: modalRoot.selectedColor === colorRect.colorData ? "#ffffff" : "transparent"
                            border.width: 2
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: modalRoot.selectedColor = colorRect.colorData
                            }
                        }
                    }
                }
            }

            // Target Days / Week
            ColumnLayout {
                Layout.fillWidth: true; spacing: 6
                Text { text: "Meta: " + modalRoot.selectedTargetDays + " dias por semana"; color: "#a7a9be"; font.pixelSize: 12 }
                RowLayout {
                    spacing: 8
                    Repeater {
                        model: [3, 4, 5, 6, 7]
                        delegate: Rectangle {
                            id: targetRect
                            property var targetData: modelData
                            Layout.preferredWidth: 44
                            Layout.preferredHeight: 32
                            radius: 6
                            color: modalRoot.selectedTargetDays === targetRect.targetData ? "#10b981" : "#211f30"
                            Text {
                                anchors.centerIn: parent
                                text: targetRect.targetData + "d"
                                color: modalRoot.selectedTargetDays === targetRect.targetData ? "#ffffff" : "#a7a9be"
                                font.pixelSize: 12
                                font.bold: true
                            }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: modalRoot.selectedTargetDays = targetRect.targetData
                            }
                        }
                    }
                }
            }

            Item { Layout.fillHeight: true }

            // Actions Footer
            RowLayout {
                Layout.fillWidth: true; spacing: 12
                Item { Layout.fillWidth: true }
                Rectangle {
                    Layout.preferredWidth: 90
                    Layout.preferredHeight: 38
                    radius: 8
                    color: "#211f30"
                    Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: modalRoot.closeModal()
                    }
                }
                Rectangle {
                    Layout.preferredWidth: modalRoot.isEditing ? 140 : 120
                    Layout.preferredHeight: 38
                    radius: 8
                    color: "#10b981"
                    Text {
                        anchors.centerIn: parent
                        text: modalRoot.isEditing ? "Salvar Alterações" : "Criar Hábito"
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                    }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            var title = newHabitTitle.text.trim()
                            if (title.length > 0) {
                                if (modalRoot.isEditing) {
                                    modalRoot.habitUpdated(modalRoot.editingHabit.id, title, modalRoot.selectedColor, modalRoot.selectedIcon, modalRoot.selectedTargetDays)
                                } else {
                                    modalRoot.habitSubmitted(title, modalRoot.selectedColor, modalRoot.selectedIcon, modalRoot.selectedTargetDays)
                                }
                                modalRoot.closeModal()
                            }
                        }
                    }
                }
            }
        }
    }
}
