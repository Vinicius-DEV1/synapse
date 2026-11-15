import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: goalModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property int targetCount: 30
    property int currentCount: 14
    readonly property double progress: targetCount > 0 ? Math.min(1.0, currentCount / targetCount) : 0

    signal closeRequested()
    signal goalSaved(int target)

    Shortcut {
        sequence: "Escape"
        enabled: goalModalRoot.visible
        onActivated: goalModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: goalModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 480)
        height: 340
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    width: 36
                    height: 36
                    radius: 8
                    color: "#338b5cf6"
                    Text { anchors.centerIn: parent; text: "🎯"; font.pixelSize: 18 }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text { text: "Meta Cultural Anual"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Acompanhe seu ritmo de filmes, séries e animes no ano"; color: "#94a1b2"; font.pixelSize: 11 }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: goalModalRoot.closeRequested()
                }
            }

            // Progress Banner
            Rectangle {
                Layout.fillWidth: true
                height: 80
                radius: 10
                color: "#11101a"
                border.color: "#2e2b44"

                ColumnLayout {
                    anchors.centerIn: parent
                    spacing: 6

                    Text {
                        text: goalModalRoot.currentCount + " de " + goalModalRoot.targetCount + " obras concluídas (" + Math.round(goalModalRoot.progress * 100) + "%)"
                        color: "#10b981"
                        font.pixelSize: 14
                        font.bold: true
                        Layout.alignment: Qt.AlignHCenter
                    }

                    Rectangle {
                        width: 340
                        height: 8
                        radius: 4
                        color: "#1f1d2e"

                        Rectangle {
                            height: parent.height
                            radius: parent.radius
                            width: parent.width * goalModalRoot.progress
                            color: "#8b5cf6"
                            Behavior on width { NumberAnimation { duration: 250 } }
                        }
                    }
                }
            }

            // Target Input
            Text { text: "Definir Meta de Obras Concluídas:"; color: "#d4d4d8"; font.pixelSize: 12; font.bold: true }
            TextField {
                id: targetInput
                Layout.fillWidth: true
                text: "" + goalModalRoot.targetCount
                color: "#fffffe"
                validator: IntValidator { bottom: 1; top: 1000 }
                background: Rectangle {
                    color: "#1f1d2e"
                    radius: 8
                    border.color: "#2e2b44"
                }
            }

            // Actions
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    text: "Cancelar"
                    Layout.fillWidth: true
                    background: Rectangle { color: "#232135"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#fffffe"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: goalModalRoot.closeRequested()
                }

                Button {
                    text: "Salvar Meta"
                    Layout.fillWidth: true
                    background: Rectangle { color: "#8b5cf6"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#ffffff"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        var val = parseInt(targetInput.text, 10)
                        if (!isNaN(val) && val > 0) {
                            goalModalRoot.targetCount = val
                            goalModalRoot.goalSaved(val)
                        }
                        goalModalRoot.closeRequested()
                    }
                }
            }
        }
    }
}
