import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: focusRoot
    color: "#0f0e17" // bg-dark-bg

    property int totalSeconds: 25 * 60
    property int remainingSeconds: 25 * 60
    property bool isRunning: false
    property string activeTag: "Estudo"
    property var lofis: []
    property var focusSessions: []
    property var activeLofi: null
    property bool isLofiPlaying: false
    property bool isCustomTimeOpen: false
    property bool isSessionCompletedModalOpen: false
    property int customMinutes: 30

    signal requestPlayLofi(var lofi)

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
                dataController.recordFocusSession(focusRoot.activeTag, Math.floor(focusRoot.totalSeconds / 60), "completed", "Sessão de foco concluída")
                focusRoot.refreshData()
                focusRoot.isSessionCompletedModalOpen = true
            }
        }
    }

    function refreshData() {
        lofis = dataController.getLofis()
        focusSessions = dataController.getFocusSessions()
    }

    function computeTodayMinutes() {
        var total = 0
        var todayStr = Qt.formatDate(new Date(), "yyyy-MM-dd")
        for (var i = 0; i < focusSessions.length; i++) {
            var s = focusSessions[i]
            if (s.created_at && s.created_at.indexOf(todayStr) !== -1) {
                total += (s.target_time_minutes || 0)
            }
        }
        return total
    }

    function computeTodaySessions() {
        var count = 0
        var todayStr = Qt.formatDate(new Date(), "yyyy-MM-dd")
        for (var i = 0; i < focusSessions.length; i++) {
            var s = focusSessions[i]
            if (s.created_at && s.created_at.indexOf(todayStr) !== -1) {
                count++
            }
        }
        return count
    }

    Component.onCompleted: {
        refreshData()
    }

    RowLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 32

        // Left Area: Circular Pomodoro Timer & Stats
        ColumnLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 20

            // Header
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
                        color: focusRoot.activeTag === modelData ? "#8b5cf626" : "#1a1924"
                        border.color: focusRoot.activeTag === modelData ? "#8b5cf680" : "#ffffff10"

                        Text {
                            id: tagText
                            anchors.centerIn: parent
                            text: modelData
                            color: focusRoot.activeTag === modelData ? "#c4b5fd" : "#a7a9be"
                            font.pixelSize: 11
                            font.bold: focusRoot.activeTag === modelData
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: focusRoot.activeTag = modelData
                        }
                    }
                }
            }

            // Presets (Subdued Brand Pills)
            RowLayout {
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

                Rectangle {
                    width: 130; height: 36; radius: 18
                    color: focusRoot.isCustomTimeOpen ? "#8b5cf633" : "#1a1924"
                    border.color: focusRoot.isCustomTimeOpen ? "#8b5cf680" : "#ffffff12"
                    Text { anchors.centerIn: parent; text: "⚙ Ajustar..."; color: focusRoot.isCustomTimeOpen ? "#c4b5fd" : "#a7a9be"; font.pixelSize: 12; font.bold: true }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: focusRoot.isCustomTimeOpen = true }
                }
            }

            // Timer Display Circle
            Rectangle {
                Layout.alignment: Qt.AlignHCenter
                width: 270
                height: 270
                radius: 135
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
                        width: statusTimerText.contentWidth + 14
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

            // Today's Stats Banner
            Rectangle {
                Layout.fillWidth: true
                height: 52
                radius: 12
                color: "#161524"
                border.color: "#ffffff0f"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: 24

                    RowLayout {
                        spacing: 8
                        Text { text: "🍅"; font.pixelSize: 14 }
                        Text { text: "Sessões Hoje:"; color: "#a7a9be"; font.pixelSize: 12 }
                        Text { text: focusRoot.computeTodaySessions().toString(); color: "#fffffe"; font.pixelSize: 13; font.bold: true }
                    }

                    RowLayout {
                        spacing: 8
                        Text { text: "⏱️"; font.pixelSize: 14 }
                        Text { text: "Tempo Focado:"; color: "#a7a9be"; font.pixelSize: 12 }
                        Text { text: focusRoot.computeTodayMinutes() + " min"; color: "#34d399"; font.pixelSize: 13; font.bold: true }
                    }

                    Item { Layout.fillWidth: true }
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

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "🎵 Trilhas Ambientais Lofi"
                        color: "#fffffe"
                        font.pixelSize: 15
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                    Text {
                        visible: focusRoot.isLofiPlaying
                        text: "▶ Tocando"
                        color: "#10b981"
                        font.pixelSize: 11
                        font.bold: true
                    }
                }

                ListView {
                    id: lofiList
                    Layout.fillWidth: true
                    Layout.preferredHeight: 140
                    clip: true
                    model: focusRoot.lofis
                    spacing: 8

                    delegate: Rectangle {
                        id: lofiRowDelegate
                        width: lofiList.width
                        height: 44
                        radius: 8
                        color: focusRoot.activeLofi === modelData ? "#8b5cf626" : (lofiRowMouse.containsMouse ? "#211f30" : "#15141b")
                        border.color: focusRoot.activeLofi === modelData ? "#8b5cf680" : "#ffffff0a"
                        border.width: 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 12

                            Text {
                                text: focusRoot.activeLofi === modelData && focusRoot.isLofiPlaying ? "🔊" : "🎧"
                                font.pixelSize: 14
                            }

                            Text {
                                Layout.fillWidth: true
                                text: modelData.title || modelData.original_name || "Trilha Lofi"
                                color: focusRoot.activeLofi === modelData ? "#c4b5fd" : "#fffffe"
                                font.pixelSize: 13
                                elide: Text.ElideRight
                            }

                            Text {
                                text: (modelData.duration || 0) + "s"
                                color: "#a7a9be"
                                font.pixelSize: 11
                            }
                        }

                        MouseArea {
                            id: lofiRowMouse
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            hoverEnabled: true
                            onClicked: {
                                if (focusRoot.activeLofi === modelData) {
                                    focusRoot.isLofiPlaying = !focusRoot.isLofiPlaying
                                    if (typeof globalLofiPlayer !== "undefined") {
                                        globalLofiPlayer.togglePlay()
                                    }
                                } else {
                                    focusRoot.activeLofi = modelData
                                    focusRoot.isLofiPlaying = true
                                    focusRoot.requestPlayLofi(modelData)
                                }
                            }
                        }
                    }

                    Text {
                        anchors.centerIn: parent
                        visible: focusRoot.lofis.length === 0
                        text: "Nenhuma trilha de áudio catalogada."
                        color: "#64748b"
                        font.pixelSize: 12
                    }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: "#ffffff0f" }

                // Session History Section
                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "📜 Histórico de Sessões"
                        color: "#fffffe"
                        font.pixelSize: 15
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: focusRoot.focusSessions.length + " registradas"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
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
                        height: 54
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
                                RowLayout {
                                    spacing: 8
                                    Text {
                                        text: modelData.tag || "Estudo"
                                        color: "#fffffe"
                                        font.pixelSize: 13
                                        font.bold: true
                                    }
                                    Text {
                                        text: "• " + (modelData.target_time_minutes || 25) + " min"
                                        color: "#c4b5fd"
                                        font.pixelSize: 12
                                    }
                                }
                                Text {
                                    text: modelData.created_at ? Qt.formatDateTime(new Date(modelData.created_at), "dd/MM/yyyy às hh:mm") : ""
                                    color: "#64748b"
                                    font.pixelSize: 11
                                }
                            }

                            // Delete Session
                            Rectangle {
                                width: 28; height: 28; radius: 6
                                color: delSessMouse.containsMouse ? "#f43f5e26" : "transparent"
                                Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }
                                MouseArea {
                                    id: delSessMouse
                                    anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        dataController.deleteFocusSession(modelData.id)
                                        focusRoot.refreshData()
                                    }
                                }
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

    // ===================================================================
    // Custom Timer Modal (SetupModal.tsx parity)
    // ===================================================================
    Rectangle {
        id: customTimerModal
        anchors.fill: parent
        color: "#aa000000"
        visible: focusRoot.isCustomTimeOpen
        z: 90

        MouseArea {
            anchors.fill: parent
            onClicked: focusRoot.isCustomTimeOpen = false
        }

        Rectangle {
            width: 380; height: 260; radius: 16
            color: "#1a1924"
            border.color: "#8b5cf655"
            border.width: 1
            anchors.centerIn: parent

            MouseArea { anchors.fill: parent }

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 24
                spacing: 16

                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "⏱️ Duração do Foco"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Item { Layout.fillWidth: true }
                    Rectangle {
                        width: 28; height: 28; radius: 6; color: "#ffffff10"
                        Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 13 }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: focusRoot.isCustomTimeOpen = false }
                    }
                }

                Text {
                    text: "Selecione ou digite a duração desejada da sua sessão em minutos:"
                    color: "#a7a9be"
                    font.pixelSize: 12
                    wrapMode: Text.WordWrap
                }

                // Quick buttons: 15m, 30m, 45m, 60m, 90m
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Repeater {
                        model: [15, 30, 45, 60, 90]
                        delegate: Rectangle {
                            Layout.fillWidth: true
                            height: 32; radius: 8
                            color: customMinInput.text === modelData.toString() ? "#8b5cf6" : "#ffffff10"
                            Text { anchors.centerIn: parent; text: modelData + "m"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: customMinInput.text = modelData.toString()
                            }
                        }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    height: 40; radius: 8
                    color: "#0f0e17"
                    border.color: customMinInput.activeFocus ? "#8b5cf6" : "#ffffff18"
                    border.width: 1

                    TextInput {
                        id: customMinInput
                        anchors.fill: parent
                        anchors.margins: 8
                        color: "#fffffe"
                        font.pixelSize: 14
                        text: "30"
                        validator: IntValidator { bottom: 1; top: 360 }
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Item { Layout.fillWidth: true }
                    Rectangle {
                        width: 90; height: 36; radius: 8; color: "#211f30"
                        Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: focusRoot.isCustomTimeOpen = false }
                    }
                    Rectangle {
                        width: 120; height: 36; radius: 8; color: "#8b5cf6"
                        Text { anchors.centerIn: parent; text: "Definir Tempo"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                var mins = parseInt(customMinInput.text) || 25
                                focusRoot.setPreset(mins)
                                focusRoot.isCustomTimeOpen = false
                            }
                        }
                    }
                }
            }
        }
    }

    // ===================================================================
    // Session Completed Celebration Modal (SuccessModal.tsx parity)
    // ===================================================================
    Rectangle {
        id: sessionSuccessModal
        anchors.fill: parent
        color: "#aa000000"
        visible: focusRoot.isSessionCompletedModalOpen
        z: 95

        MouseArea {
            anchors.fill: parent
            onClicked: focusRoot.isSessionCompletedModalOpen = false
        }

        Rectangle {
            width: 420; height: 320; radius: 20
            color: "#161524"
            border.color: "#10b98155"
            border.width: 1
            anchors.centerIn: parent

            MouseArea { anchors.fill: parent }

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 28
                spacing: 14

                Text { Layout.alignment: Qt.AlignHCenter; text: "🎉"; font.pixelSize: 48 }

                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: "Sessão Concluída com Sucesso!"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }

                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: "Você completou " + Math.floor(focusRoot.totalSeconds / 60) + " minutos de foco em \"" + focusRoot.activeTag + "\".\nRegistro computado no histórico do dia."
                    color: "#a7a9be"
                    font.pixelSize: 13
                    horizontalAlignment: Text.AlignHCenter
                    lineHeight: 1.4
                }

                Item { Layout.fillHeight: true }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    Rectangle {
                        Layout.fillWidth: true
                        height: 40; radius: 10
                        color: "#10b98126"
                        border.color: "#10b98166"
                        Text { anchors.centerIn: parent; text: "Pausa Curta (5m)"; color: "#34d399"; font.pixelSize: 12; font.bold: true }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                focusRoot.isSessionCompletedModalOpen = false
                                focusRoot.setPreset(5)
                                focusRoot.toggleTimer()
                            }
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        height: 40; radius: 10
                        color: "#8b5cf6"
                        Text { anchors.centerIn: parent; text: "Novo Pomodoro (25m)"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                focusRoot.isSessionCompletedModalOpen = false
                                focusRoot.setPreset(25)
                                focusRoot.toggleTimer()
                            }
                        }
                    }
                }
            }
        }
    }
}
