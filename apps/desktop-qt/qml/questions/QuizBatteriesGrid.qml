import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: gridRoot
    Layout.fillWidth: true
    spacing: 16

    property var batteries: []

    signal startBatteryRequested(var battery)
    signal addQuestionRequested(var battery)
    signal deleteBatteryRequested(string batteryId)
    signal startGeneralPracticeRequested()
    signal createBatteryRequested()

    // Section Title
    RowLayout {
        Layout.fillWidth: true
        spacing: 8
        Text { text: "📚"; font.pixelSize: 16 }
        Text {
            text: "Baterias de Questões (" + gridRoot.batteries.length + ")"
            color: "#fffffe"
            font.pixelSize: 16
            font.bold: true
        }
    }

    // Batteries Grid
    GridView {
        id: batteryGrid
        Layout.fillWidth: true
        visible: gridRoot.batteries.length > 0
        Layout.preferredHeight: visible ? Math.max(300, Math.ceil(gridRoot.batteries.length / Math.max(1, Math.floor(width / 340))) * 180) : 0
        clip: true
        cellWidth: 340
        cellHeight: 180
        model: gridRoot.batteries

        delegate: Rectangle {
            width: 320
            height: 160
            radius: 12
            color: "#1a1924"
            border.color: batMouse.containsMouse ? "#666366f1" : "#0fffffff"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 18
                spacing: 10

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Text { text: "📦"; font.pixelSize: 16 }
                    Text {
                        Layout.fillWidth: true
                        text: modelData.title || "Bateria sem título"
                        color: "#fffffe"
                        font.pixelSize: 15
                        font.bold: true
                        elide: Text.ElideRight
                    }
                    Rectangle {
                        Layout.preferredWidth: countText.contentWidth + 12
                        Layout.preferredHeight: 22
                        radius: 11
                        color: "#206366f1"
                        Text {
                            id: countText
                            anchors.centerIn: parent
                            text: (modelData.question_count || 0) + " Q"
                            color: "#a78bfa"
                            font.pixelSize: 11
                            font.bold: true
                        }
                    }
                }

                Text {
                    Layout.fillWidth: true
                    text: modelData.description || "Sem descrição"
                    color: "#a7a9be"
                    font.pixelSize: 12
                    elide: Text.ElideRight
                }

                Item { Layout.fillHeight: true }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 32
                        radius: 8
                        color: "#6366f1"

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text { text: "▶"; color: "#ffffff"; font.pixelSize: 10 }
                            Text { text: "Resolver"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: gridRoot.startBatteryRequested(modelData)
                        }
                    }

                    Rectangle {
                        Layout.preferredWidth: 32
                        Layout.preferredHeight: 32
                        radius: 8
                        color: "#0affffff"

                        Text { anchors.centerIn: parent; text: "+"; color: "#a7a9be"; font.pixelSize: 16; font.bold: true }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: gridRoot.addQuestionRequested(modelData)
                        }
                    }

                    Rectangle {
                        Layout.preferredWidth: 32
                        Layout.preferredHeight: 32
                        radius: 8
                        color: "#0affffff"

                        Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: gridRoot.deleteBatteryRequested(modelData.id)
                        }
                    }
                }
            }

            MouseArea {
                id: batMouse
                anchors.fill: parent
                z: -1
                hoverEnabled: true
            }
        }
    }

    // Empty state directs users to create real content without sample questions.
    Rectangle {
        visible: gridRoot.batteries.length === 0
        Layout.fillWidth: true
        Layout.preferredHeight: 220
        radius: 16
        color: "#161524"
        border.color: "#0fffffff"

        ColumnLayout {
            anchors.centerIn: parent
            spacing: 12
            Text { Layout.alignment: Qt.AlignHCenter; text: "💡"; font.pixelSize: 36 }
            Text {
                Layout.alignment: Qt.AlignHCenter
                text: "Nenhuma bateria personalizada criada ainda"
                color: "#fffffe"
                font.pixelSize: 16
                font.bold: true
            }
            Text {
                Layout.alignment: Qt.AlignHCenter
                text: "Crie uma bateria e adicione suas próprias questões para começar a estudar."
                color: "#a7a9be"
                font.pixelSize: 13
            }
            Item { Layout.preferredHeight: 4 }
            Rectangle {
                Layout.alignment: Qt.AlignHCenter
                Layout.preferredWidth: 150
                Layout.preferredHeight: 38
                radius: 8
                color: "#6366f1"
                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Criar bateria"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: gridRoot.createBatteryRequested()
                }
            }
        }
    }

}
