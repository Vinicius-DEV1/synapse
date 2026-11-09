import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: habitWidgetRoot
    implicitWidth: 320
    implicitHeight: 84
    radius: 10
    color: "#161524"
    border.color: isCompleted ? "#10b98140" : "#ffffff12"
    border.width: 1

    property string habitTitle: "Estudar 30 min de Rust / C++"
    property int currentStreak: 7
    property bool isCompleted: false

    RowLayout {
        anchors.fill: parent
        anchors.margins: 14
        spacing: 12

        // Checkbox button
        Rectangle {
            width: 28
            height: 28
            radius: 7
            color: habitWidgetRoot.isCompleted ? "#10b981" : "#27272a"
            border.color: habitWidgetRoot.isCompleted ? "#10b981" : "#3f3f46"
            border.width: 1

            Text {
                anchors.centerIn: parent
                text: "✓"
                color: "#ffffff"
                font.pixelSize: 15
                font.bold: true
                visible: habitWidgetRoot.isCompleted
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    habitWidgetRoot.isCompleted = !habitWidgetRoot.isCompleted;
                    if (habitWidgetRoot.isCompleted) {
                        habitWidgetRoot.currentStreak++;
                    } else {
                        habitWidgetRoot.currentStreak = Math.max(0, habitWidgetRoot.currentStreak - 1);
                    }
                }
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2

            Text {
                text: habitWidgetRoot.habitTitle
                color: habitWidgetRoot.isCompleted ? "#a1a1aa" : "#ffffff"
                font.pixelSize: 14
                font.weight: Font.Medium
                font.strikeout: habitWidgetRoot.isCompleted
            }

            Text {
                text: "🔥 Sequência de " + habitWidgetRoot.currentStreak + " dias"
                color: "#fb923c"
                font.pixelSize: 12
            }
        }
    }
}

