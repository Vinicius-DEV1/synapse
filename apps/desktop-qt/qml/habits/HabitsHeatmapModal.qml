import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: heatmapModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property var habit: null
    property int totalCheckinsCount: 42
    property int currentStreakDays: 8
    property int longestStreakDays: 21

    signal closeRequested()

    Shortcut {
        sequence: "Escape"
        enabled: heatmapModalRoot.visible
        onActivated: heatmapModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: heatmapModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 860)
        height: Math.min(parent.height - 48, 480)
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    width: 36
                    height: 36
                    radius: 8
                    color: heatmapModalRoot.habit && heatmapModalRoot.habit.color ? heatmapModalRoot.habit.color + "26" : "#2610b981"
                    Text {
                        anchors.centerIn: parent
                        text: heatmapModalRoot.habit ? (heatmapModalRoot.habit.icon || "⭐") : "⭐"
                        font.pixelSize: 18
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: heatmapModalRoot.habit ? (heatmapModalRoot.habit.title || "Hábito") : "Hábito"
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.bold: true
                    }
                    Text {
                        text: "Histórico anual de consistência e heatmap de check-ins"
                        color: "#94a1b2"
                        font.pixelSize: 12
                    }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: heatmapModalRoot.closeRequested()
                }
            }

            // Quick Stats Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    Layout.fillWidth: true
                    height: 60
                    radius: 8
                    color: "#11101a"
                    border.color: "#2e2b44"
                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 2
                        Text { text: "Total de Check-ins"; color: "#94a1b2"; font.pixelSize: 10; Layout.alignment: Qt.AlignHCenter }
                        Text { text: "" + heatmapModalRoot.totalCheckinsCount; color: "#10b981"; font.pixelSize: 16; font.bold: true; Layout.alignment: Qt.AlignHCenter }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    height: 60
                    radius: 8
                    color: "#11101a"
                    border.color: "#2e2b44"
                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 2
                        Text { text: "Sequência Atual"; color: "#94a1b2"; font.pixelSize: 10; Layout.alignment: Qt.AlignHCenter }
                        Text { text: heatmapModalRoot.currentStreakDays + " dias"; color: "#f59e0b"; font.pixelSize: 16; font.bold: true; Layout.alignment: Qt.AlignHCenter }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    height: 60
                    radius: 8
                    color: "#11101a"
                    border.color: "#2e2b44"
                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 2
                        Text { text: "Maior Sequência"; color: "#94a1b2"; font.pixelSize: 10; Layout.alignment: Qt.AlignHCenter }
                        Text { text: heatmapModalRoot.longestStreakDays + " dias"; color: "#8b5cf6"; font.pixelSize: 16; font.bold: true; Layout.alignment: Qt.AlignHCenter }
                    }
                }
            }

            // Annual Heatmap Grid (52 columns x 7 rows)
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 10
                color: "#11101a"
                border.color: "#2e2b44"

                ScrollView {
                    anchors.fill: parent
                    anchors.margins: 14
                    clip: true

                    RowLayout {
                        spacing: 3

                        Repeater {
                            model: 52 // 52 weeks

                            ColumnLayout {
                                id: weekCol
                                property int weekIndex: index
                                spacing: 3

                                Repeater {
                                    model: 7 // 7 days per week

                                    Rectangle {
                                        id: dayCell
                                        width: 11
                                        height: 11
                                        radius: 2

                                        property int dayVal: ((weekCol.weekIndex * 7 + index) % 4 === 0) ? 1 : (((weekCol.weekIndex * 3 + index) % 5 === 0) ? 2 : 0)

                                        color: {
                                            if (dayVal === 0) return "#1f1d2e"
                                            if (dayVal === 1) return "#065f46"
                                            if (dayVal === 2) return "#10b981"
                                            return "#34d399"
                                        }

                                        ToolTip.visible: cellMouse.containsMouse
                                        ToolTip.text: "Dia " + (weekCol.weekIndex * 7 + index + 1) + ": " + (dayVal > 0 ? "Concluído" : "Pendente")

                                        MouseArea {
                                            id: cellMouse
                                            anchors.fill: parent
                                            hoverEnabled: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Legend Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Item { Layout.fillWidth: true }

                Text { text: "Menos"; color: "#94a1b2"; font.pixelSize: 11 }
                Rectangle { width: 10; height: 10; radius: 2; color: "#1f1d2e" }
                Rectangle { width: 10; height: 10; radius: 2; color: "#065f46" }
                Rectangle { width: 10; height: 10; radius: 2; color: "#10b981" }
                Rectangle { width: 10; height: 10; radius: 2; color: "#34d399" }
                Text { text: "Mais"; color: "#94a1b2"; font.pixelSize: 11 }
            }
        }
    }
}
