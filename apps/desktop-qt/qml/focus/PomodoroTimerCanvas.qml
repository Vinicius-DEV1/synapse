import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: canvasRoot
    Layout.fillWidth: true
    Layout.fillHeight: true
    spacing: 20

    property int totalSeconds: 25 * 60
    property int remainingSeconds: 25 * 60
    property bool isRunning: false
    property string activeTag: "Estudo"
    property int todayMinutes: 0
    property int todaySessions: 0

    signal tagSelected(string tag)
    signal presetSelected(int minutes)
    signal customTimeRequested()
    signal startPauseRequested()
    signal resetRequested()
    signal helpRequested()

    function formatTime(secs) {
        var m = Math.floor(secs / 60)
        var s = secs % 60
        return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s
    }

    // Header
    RowLayout {
        Layout.fillWidth: true
        spacing: 16

        ColumnLayout {
            spacing: 4
            Text {
                text: "⏳ Foco Imersivo & Pomodoro"
                color: "#fffffe"
                font.pixelSize: 24
                font.bold: true
            }
            Text {
                text: "Técnica Pomodoro com bloqueio de distrações e registro de consistência"
                color: "#a7a9be"
                font.pixelSize: 13
            }
        }

        Item { Layout.fillWidth: true }

        // Help / Guide Button
        Rectangle {
            width: 36
            height: 36
            radius: 8
            color: helpMouse.containsMouse ? "#262438" : "#1a1924"
            border.color: helpMouse.containsMouse ? "#808b5cf6" : "#18ffffff"
            border.width: 1

            Text {
                anchors.centerIn: parent
                text: "?"
                color: helpMouse.containsMouse ? "#ffffff" : "#a7a9be"
                font.pixelSize: 15
                font.bold: true
            }

            MouseArea {
                id: helpMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: canvasRoot.helpRequested()
            }
        }
    }

    // Category Tag Pills
    RowLayout {
        spacing: 8
        Text { text: "Categoria:"; color: "#64748b"; font.pixelSize: 12; font.bold: true }

        Repeater {
            model: ["Estudo", "Código", "Leitura", "Trabalho", "Revisão"]
            delegate: Rectangle {
                width: tagText.contentWidth + 16
                height: 28
                radius: 6
                color: canvasRoot.activeTag === modelData ? "#268b5cf6" : "#1a1924"
                border.color: canvasRoot.activeTag === modelData ? "#808b5cf6" : "#10ffffff"

                Text {
                    id: tagText
                    anchors.centerIn: parent
                    text: modelData
                    color: canvasRoot.activeTag === modelData ? "#c4b5fd" : "#a7a9be"
                    font.pixelSize: 11
                    font.bold: canvasRoot.activeTag === modelData
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: canvasRoot.tagSelected(modelData)
                }
            }
        }
    }

    // Presets (Subdued Brand Pills)
    RowLayout {
        spacing: 10

        Rectangle {
            width: 140; height: 36; radius: 18
            color: canvasRoot.totalSeconds === 25 * 60 ? "#338b5cf6" : "#1a1924"
            border.color: canvasRoot.totalSeconds === 25 * 60 ? "#808b5cf6" : "#12ffffff"
            Text { anchors.centerIn: parent; text: "Pomodoro (25m)"; color: canvasRoot.totalSeconds === 25 * 60 ? "#c4b5fd" : "#a7a9be"; font.pixelSize: 12; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: canvasRoot.presetSelected(25) }
        }

        Rectangle {
            width: 140; height: 36; radius: 18
            color: canvasRoot.totalSeconds === 50 * 60 ? "#338b5cf6" : "#1a1924"
            border.color: canvasRoot.totalSeconds === 50 * 60 ? "#808b5cf6" : "#12ffffff"
            Text { anchors.centerIn: parent; text: "Foco Longo (50m)"; color: canvasRoot.totalSeconds === 50 * 60 ? "#c4b5fd" : "#a7a9be"; font.pixelSize: 12; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: canvasRoot.presetSelected(50) }
        }

        Rectangle {
            width: 140; height: 36; radius: 18
            color: canvasRoot.totalSeconds === 5 * 60 ? "#338b5cf6" : "#1a1924"
            border.color: canvasRoot.totalSeconds === 5 * 60 ? "#808b5cf6" : "#12ffffff"
            Text { anchors.centerIn: parent; text: "Pausa Curta (5m)"; color: canvasRoot.totalSeconds === 5 * 60 ? "#c4b5fd" : "#a7a9be"; font.pixelSize: 12; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: canvasRoot.presetSelected(5) }
        }

        Rectangle {
            width: 130; height: 36; radius: 18
            color: "#1a1924"
            border.color: "#12ffffff"
            Text { anchors.centerIn: parent; text: "⚙ Ajustar..."; color: "#a7a9be"; font.pixelSize: 12; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: canvasRoot.customTimeRequested() }
        }
    }

    // Timer Display Circle
    Rectangle {
        Layout.alignment: Qt.AlignHCenter
        width: 270
        height: 270
        radius: 135
        color: "#1a1924" // bg-dark-card
        border.color: canvasRoot.isRunning ? "#10b981" : "#7c3aed"
        border.width: 4

        ColumnLayout {
            anchors.centerIn: parent
            spacing: 8

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: canvasRoot.formatTime(canvasRoot.remainingSeconds)
                color: "#fffffe"
                font.pixelSize: 52
                font.bold: true
                font.family: "Monospace"
            }

            Rectangle {
                Layout.alignment: Qt.AlignHCenter
                width: statusTimerText.contentWidth + 14
                height: 22
                radius: 11
                color: canvasRoot.isRunning ? "#2610b981" : "#268b5cf6"

                Text {
                    id: statusTimerText
                    anchors.centerIn: parent
                    text: canvasRoot.isRunning ? "EM ANDAMENTO" : "PAUSADO"
                    color: canvasRoot.isRunning ? "#34d399" : "#c4b5fd"
                    font.pixelSize: 10
                    font.bold: true
                }
            }
        }
    }

    // Controls Row (Solid Brand Buttons)
    RowLayout {
        Layout.alignment: Qt.AlignHCenter
        spacing: 16

        Rectangle {
            width: 140
            height: 44
            radius: 22
            color: canvasRoot.isRunning ? "#f43f5e" : "#7c3aed"

            Text {
                anchors.centerIn: parent
                text: canvasRoot.isRunning ? "Pausar" : "Iniciar Foco"
                color: "#ffffff"
                font.pixelSize: 14
                font.bold: true
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: canvasRoot.startPauseRequested()
            }
        }

        Rectangle {
            width: 110
            height: 44
            radius: 22
            color: "#1a1924"
            border.color: "#1affffff"

            Text {
                anchors.centerIn: parent
                text: "Resetar"
                color: "#a7a9be"
                font.pixelSize: 14
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: canvasRoot.resetRequested()
            }
        }
    }

    // Today's Stats Banner
    Rectangle {
        Layout.fillWidth: true
        height: 52
        radius: 12
        color: "#161524"
        border.color: "#0fffffff"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.margins: 14
            spacing: 24

            RowLayout {
                spacing: 8
                Text { text: "🍅"; font.pixelSize: 14 }
                Text { text: "Sessões Hoje:"; color: "#a7a9be"; font.pixelSize: 12 }
                Text { text: canvasRoot.todaySessions.toString(); color: "#fffffe"; font.pixelSize: 13; font.bold: true }
            }

            RowLayout {
                spacing: 8
                Text { text: "⏱️"; font.pixelSize: 14 }
                Text { text: "Tempo Focado:"; color: "#a7a9be"; font.pixelSize: 12 }
                Text { text: canvasRoot.todayMinutes + " min"; color: "#34d399"; font.pixelSize: 13; font.bold: true }
            }

            Item { Layout.fillWidth: true }
        }
    }

    Item { Layout.fillHeight: true }
}
