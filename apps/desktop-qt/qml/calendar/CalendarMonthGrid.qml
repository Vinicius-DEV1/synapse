import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: monthGridRoot
    spacing: 12

    property var monthCells: []
    property string currentMonthLabel: ""

    signal prevMonthRequested()
    signal nextMonthRequested()
    signal todayRequested()
    signal cellClicked(string dateStr)

    // Month Nav Bar
    RowLayout {
        Layout.fillWidth: true
        spacing: 12

        Rectangle {
            width: 32; height: 32; radius: 8
            color: "#161524"; border.color: "#ffffff15"
            Text { anchors.centerIn: parent; text: "‹"; color: "#fffffe"; font.pixelSize: 18 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: monthGridRoot.prevMonthRequested() }
        }

        Text {
            text: monthGridRoot.currentMonthLabel
            color: "#fffffe"
            font.pixelSize: 18
            font.bold: true
        }

        Rectangle {
            width: 32; height: 32; radius: 8
            color: "#161524"; border.color: "#ffffff15"
            Text { anchors.centerIn: parent; text: "›"; color: "#fffffe"; font.pixelSize: 18 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: monthGridRoot.nextMonthRequested() }
        }

        Rectangle {
            width: 60; height: 32; radius: 8
            color: "#161524"; border.color: "#ffffff15"
            Text { anchors.centerIn: parent; text: "Hoje"; color: "#38bdf8"; font.pixelSize: 12; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: monthGridRoot.todayRequested() }
        }

        Item { Layout.fillWidth: true }
    }

    // Days of week header
    RowLayout {
        Layout.fillWidth: true
        spacing: 8
        Repeater {
            model: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
            Rectangle {
                Layout.fillWidth: true
                height: 28
                color: "transparent"
                Text {
                    anchors.centerIn: parent
                    text: modelData
                    color: "#64748b"
                    font.pixelSize: 12
                    font.bold: true
                }
            }
        }
    }

    // Grid of 35 or 42 cells
    GridView {
        id: monthCellsGrid
        Layout.fillWidth: true
        Layout.fillHeight: true
        clip: true
        cellWidth: width / 7
        cellHeight: Math.max(76, height / Math.ceil(model.length / 7))
        model: monthGridRoot.monthCells

        delegate: Rectangle {
            width: monthCellsGrid.cellWidth - 4
            height: monthCellsGrid.cellHeight - 4
            x: 2; y: 2
            radius: 8
            color: modelData.isToday ? "#1e293b" : (cellMouse.containsMouse ? "#201e30" : "#141320")
            border.color: modelData.isToday ? "#38bdf888" : "#ffffff0a"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 6
                spacing: 4

                RowLayout {
                    Layout.fillWidth: true
                    Rectangle {
                        width: 22; height: 22; radius: 11
                        color: modelData.isToday ? "#38bdf8" : "transparent"
                        Text {
                            anchors.centerIn: parent
                            text: modelData.dayNum
                            color: modelData.isToday ? "#0f172a" : (modelData.isCurrentMonth ? "#fffffe" : "#475569")
                            font.pixelSize: 11
                            font.bold: modelData.isToday
                        }
                    }
                    Item { Layout.fillWidth: true }
                }

                // Day's events summary pills
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Repeater {
                        model: modelData.events ? modelData.events.slice(0, 2) : []
                        Rectangle {
                            Layout.fillWidth: true
                            height: 18
                            radius: 4
                            color: (modelData.color || "#3b82f6") + "33"
                            border.color: (modelData.color || "#3b82f6") + "66"
                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 4
                                anchors.rightMargin: 4
                                Rectangle {
                                    width: 6; height: 6; radius: 3
                                    color: modelData.color || "#3b82f6"
                                }
                                Text {
                                    text: modelData.title
                                    color: "#fffffe"
                                    font.pixelSize: 10
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }
                            }
                        }
                    }
                    Text {
                        visible: modelData.events && modelData.events.length > 2
                        text: "+" + (modelData.events.length - 2) + " mais"
                        color: "#64748b"
                        font.pixelSize: 9
                    }
                }
                Item { Layout.fillHeight: true }
            }

            MouseArea {
                id: cellMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: monthGridRoot.cellClicked(modelData.dateStr)
            }
        }
    }
}
