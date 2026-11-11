import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#88000000"
    z: 95
    visible: false

    property string selectedColor: "#10b981"
    property string selectedIcon: "⭐"
    property int selectedTargetDays: 7

    signal closed()
    signal habitSubmitted(string title, string color, string icon, int targetDays)

    function openModal() {
        newHabitTitle.text = ""
        selectedColor = "#10b981"
        selectedIcon = "⭐"
        selectedTargetDays = 7
        modalRoot.visible = true
        newHabitTitle.forceActiveFocus()
    }

    function closeModal() {
        modalRoot.visible = false
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
                Text { text: "⚡ Novo Hábito Diário"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                Item { Layout.fillWidth: true }
                Text {
                    text: "✕"; color: "#a7a9be"; font.pixelSize: 16
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
                            width: 36; height: 36; radius: 8
                            color: modalRoot.selectedIcon === modelData ? "#3310b981" : "#211f30"
                            border.color: modalRoot.selectedIcon === modelData ? "#10b981" : "#10ffffff"
                            border.width: 1
                            Text { anchors.centerIn: parent; text: modelData; font.pixelSize: 18 }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: modalRoot.selectedIcon = modelData
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
                            width: 28; height: 28; radius: 14; color: modelData
                            border.color: modalRoot.selectedColor === modelData ? "#ffffff" : "transparent"
                            border.width: 2
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: modalRoot.selectedColor = modelData
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
                            width: 44; height: 32; radius: 6
                            color: modalRoot.selectedTargetDays === modelData ? "#10b981" : "#211f30"
                            Text {
                                anchors.centerIn: parent; text: modelData + "d"
                                color: modalRoot.selectedTargetDays === modelData ? "#ffffff" : "#a7a9be"
                                font.pixelSize: 12; font.bold: true
                            }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: modalRoot.selectedTargetDays = modelData
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
                    width: 90; height: 38; radius: 8; color: "#211f30"
                    Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: modalRoot.closeModal()
                    }
                }
                Rectangle {
                    width: 120; height: 38; radius: 8; color: "#10b981"
                    Text { anchors.centerIn: parent; text: "Criar Hábito"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (newHabitTitle.text.trim().length > 0) {
                                modalRoot.habitSubmitted(newHabitTitle.text.trim(), modalRoot.selectedColor, modalRoot.selectedIcon, modalRoot.selectedTargetDays)
                                modalRoot.closeModal()
                            }
                        }
                    }
                }
            }
        }
    }
}
