import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: focusRoot
    color: "#0f0e17" // bg-dark-bg

    property int totalSeconds: 25 * 60
    property int remainingSeconds: 25 * 60
    property bool isRunning: false
    property var lofis: []
    property var focusSessions: []

    function formatTime(secs) {
        var m = Math.floor(secs / 60)
        var s = secs % 60
        return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s
    }

    function setPreset(minutes) {
        isRunning = false
        timer.stop()
        totalSeconds = minutes * 60
        remainingSeconds = totalSeconds
    }

    function toggleTimer() {
        isRunning = !isRunning
        if (isRunning) timer.start()
        else timer.stop()
    }

    function resetTimer() {
        isRunning = false
        timer.stop()
        remainingSeconds = totalSeconds
    }

    Timer {
        id: timer
        interval: 1000
        repeat: true
        onTriggered: {
            if (focusRoot.remainingSeconds > 0) {
                focusRoot.remainingSeconds--
            } else {
                focusRoot.isRunning = false
                timer.stop()
                dataController.recordFocusSession("Pomodoro", Math.floor(focusRoot.totalSeconds / 60), "completed", "Sessão concluída")
                focusRoot.refreshData()
            }
        }
    }

    function refreshData() {
        lofis = dataController.getLofis()
        focusSessions = dataController.getFocusSessions()
    }

    Component.onCompleted: {
        refreshData()
    }

    RowLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 32

        // Left Area: Circular Pomodoro Timer
        ColumnLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.alignment: Qt.AlignHCenter
            spacing: 24

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: "⏳ Foco Imersivo Pomodoro"
                color: "#fffffe"
                font.pixelSize: 24
                font.bold: true
            }

            // Presets (Subdued Brand Pills)
            RowLayout {
                Layout.alignment: Qt.AlignHCenter
                spacing: 10

                Rectangle {
                    width: 140; height: 36; radius: 18
                    color: focusRoot.totalSeconds === 25 * 60 ? "#8b5cf633" : "#1a1924"
                    border.color: focusRoot.totalSeconds === 25 * 60 ? "#8b5cf680" : "#ffffff12"
                    Text { anchors.centerIn: parent; text: "Pomodoro (25m)"; color: focusRoot.totalSeconds === 25 * 60 ? "#c4b5fd" : "#a7a9be"; font.pixelSize: 12; font.bold: true }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: focusRoot.setPreset(25) }
                }

                Rectangle {
                    width: 140; height: 36; radius: 18
                    color: focusRoot.totalSeconds === 50 * 60 ? "#8b5cf633" : "#1a1924"
                    border.color: focusRoot.totalSeconds === 50 * 60 ? "#8b5cf680" : "#ffffff12"
                    Text { anchors.centerIn: parent; text: "Foco Longo (50m)"; color: focusRoot.totalSeconds === 50 * 60 ? "#c4b5fd" : "#a7a9be"; font.pixelSize: 12; font.bold: true }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: focusRoot.setPreset(50) }
                }

                Rectangle {
                    width: 140; height: 36; radius: 18
                    color: focusRoot.totalSeconds === 5 * 60 ? "#8b5cf633" : "#1a1924"
                    border.color: focusRoot.totalSeconds === 5 * 60 ? "#8b5cf680" : "#ffffff12"
                    Text { anchors.centerIn: parent; text: "Pausa Curta (5m)"; color: focusRoot.totalSeconds === 5 * 60 ? "#c4b5fd" : "#a7a9be"; font.pixelSize: 12; font.bold: true }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: focusRoot.setPreset(5) }
                }
            }

            // Timer Display Circle
            Rectangle {
                Layout.alignment: Qt.AlignHCenter
                width: 280
                height: 280
                radius: 140
                color: "#1a1924" // bg-dark-card
                border.color: focusRoot.isRunning ? "#10b981" : "#7c3aed"
                border.width: 4

                ColumnLayout {
                    anchors.centerIn: parent
                    spacing: 8

                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: focusRoot.formatTime(focusRoot.remainingSeconds)
                        color: "#fffffe"
                        font.pixelSize: 52
                        font.bold: true
                        font.family: "Monospace"
                    }

                    Rectangle {
                        Layout.alignment: Qt.AlignHCenter
                        width: statusTimerText.contentWidth + 12
                        height: 22
                        radius: 11
                        color: focusRoot.isRunning ? "#10b98126" : "#8b5cf626"

                        Text {
                            id: statusTimerText
                            anchors.centerIn: parent
                            text: focusRoot.isRunning ? "EM ANDAMENTO" : "PAUSADO"
                            color: focusRoot.isRunning ? "#34d399" : "#c4b5fd"
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
                    color: focusRoot.isRunning ? "#f43f5e" : "#7c3aed"

                    Text {
                        anchors.centerIn: parent
                        text: focusRoot.isRunning ? "Pausar" : "Iniciar Foco"
                        color: "#ffffff"
                        font.pixelSize: 14
                        font.bold: true
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: focusRoot.toggleTimer()
                    }
                }

                Rectangle {
                    width: 110
                    height: 44
                    radius: 22
                    color: "#1a1924"
                    border.color: "#ffffff1a"

                    Text {
                        anchors.centerIn: parent
                        text: "Resetar"
                        color: "#a7a9be"
                        font.pixelSize: 14
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: focusRoot.resetTimer()
                    }
                }
            }

            Item { Layout.fillHeight: true }
        }

        // Right Area: Lofi Ambient & Session History
        Rectangle {
            Layout.preferredWidth: 380
            Layout.fillHeight: true
            radius: 16
            color: "#1a1924" // bg-dark-card
            border.color: "#ffffff0f"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 20
                spacing: 16

                Text {
                    text: "🎵 Trilhas de Áudio Lofi"
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                }

                ListView {
                    id: lofiList
                    Layout.fillWidth: true
                    Layout.preferredHeight: 140
                    clip: true
                    model: focusRoot.lofis
                    spacing: 8

                    delegate: Rectangle {
                        width: lofiList.width
                        height: 44
                        radius: 8
                        color: "#15141b" // bg-dark-surface
                        border.color: "#ffffff0a"

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 12

                            Text {
                                text: "🎧"
                                font.pixelSize: 14
                            }

                            Text {
                                Layout.fillWidth: true
                                text: modelData.title || modelData.original_name || "Trilha Lofi"
                                color: "#fffffe"
                                font.pixelSize: 13
                                elide: Text.ElideRight
                            }

                            Text {
                                text: (modelData.duration || 0) + "s"
                                color: "#a7a9be"
                                font.pixelSize: 11
                            }
                        }
                    }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: "#ffffff0f" }

                Text {
                    text: "📜 Histórico de Sessões"
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                }

                ListView {
                    id: historyList
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    model: focusRoot.focusSessions
                    spacing: 8

                    delegate: Rectangle {
                        width: historyList.width
                        height: 52
                        radius: 8
                        color: "#15141b"
                        border.color: "#ffffff0a"

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 12

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    text: (modelData.tag || "Estudo") + " • " + (modelData.target_time_minutes || 25) + " min"
                                    color: "#fffffe"
                                    font.pixelSize: 13
                                    font.bold: true
                                }
                                Text {
                                    text: modelData.created_at ? Qt.formatDateTime(new Date(modelData.created_at), "dd/MM/yyyy hh:mm") : ""
                                    color: "#a7a9be"
                                    font.pixelSize: 11
                                }
                            }

                            Text {
                                text: "✓"
                                color: "#10b981"
                                font.pixelSize: 14
                                font.bold: true
                            }
                        }
                    }

                    Text {
                        anchors.centerIn: parent
                        visible: focusRoot.focusSessions.length === 0
                        text: "Nenhuma sessão registrada."
                        color: "#64748b"
                        font.pixelSize: 13
                    }
                }
            }
        }
    }
}
