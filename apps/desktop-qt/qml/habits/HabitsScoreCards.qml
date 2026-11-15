import QtQuick 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: scoreCardsRoot
    Layout.fillWidth: true
    spacing: 16

    property var habits: []
    property var last7Days: []
    property var logMap: ({})

    function getCompletedTodayCount() {
        if (!last7Days || last7Days.length === 0 || !habits) return 0
        var todayIso = last7Days[last7Days.length - 1].date
        var count = 0
        for (var i = 0; i < habits.length; i++) {
            if (logMap[habits[i].id + "_" + todayIso] === true) {
                count++
            }
        }
        return count
    }

    function getWeeklyRatePercentage() {
        if (!habits || habits.length === 0 || !last7Days || last7Days.length === 0) return 0
        var totalPossible = habits.length * 7
        var totalDone = 0
        for (var h = 0; h < habits.length; h++) {
            for (var d = 0; d < last7Days.length; d++) {
                if (logMap[habits[h].id + "_" + last7Days[d].date] === true) {
                    totalDone++
                }
            }
        }
        return totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0
    }

    // Card 1: Hábitos Ativos
    Rectangle {
        Layout.fillWidth: true
        height: 72
        radius: 12
        color: "#161524"
        border.color: "#2e2b44"
        ColumnLayout {
            anchors.centerIn: parent
            spacing: 2
            Text { text: "Hábitos Ativos"; color: "#94a1b2"; font.pixelSize: 11; Layout.alignment: Qt.AlignHCenter }
            Text { text: "" + (scoreCardsRoot.habits ? scoreCardsRoot.habits.length : 0); color: "#fffffe"; font.pixelSize: 18; font.bold: true; Layout.alignment: Qt.AlignHCenter }
        }
    }

    // Card 2: Concluídos Hoje
    Rectangle {
        Layout.fillWidth: true
        height: 72
        radius: 12
        color: "#161524"
        border.color: "#2e2b44"
        ColumnLayout {
            anchors.centerIn: parent
            spacing: 2
            Text { text: "Concluídos Hoje"; color: "#94a1b2"; font.pixelSize: 11; Layout.alignment: Qt.AlignHCenter }
            Text {
                text: scoreCardsRoot.getCompletedTodayCount() + " / " + (scoreCardsRoot.habits ? scoreCardsRoot.habits.length : 0)
                color: "#10b981"
                font.pixelSize: 18
                font.bold: true
                Layout.alignment: Qt.AlignHCenter
            }
        }
    }

    // Card 3: Taxa de Conclusão Semanal
    Rectangle {
        Layout.fillWidth: true
        height: 72
        radius: 12
        color: "#161524"
        border.color: "#2e2b44"
        ColumnLayout {
            anchors.centerIn: parent
            spacing: 2
            Text { text: "Taxa Semanal"; color: "#94a1b2"; font.pixelSize: 11; Layout.alignment: Qt.AlignHCenter }
            Text { text: scoreCardsRoot.getWeeklyRatePercentage() + "%"; color: "#8b5cf6"; font.pixelSize: 18; font.bold: true; Layout.alignment: Qt.AlignHCenter }
        }
    }

    // Card 4: Sequência Ativa
    Rectangle {
        Layout.fillWidth: true
        height: 72
        radius: 12
        color: "#161524"
        border.color: "#2e2b44"
        ColumnLayout {
            anchors.centerIn: parent
            spacing: 2
            Text { text: "Consistência"; color: "#94a1b2"; font.pixelSize: 11; Layout.alignment: Qt.AlignHCenter }
            Text { text: "🔥 " + (scoreCardsRoot.habits && scoreCardsRoot.habits.length > 0 ? "Ativa" : "0 dias"); color: "#f59e0b"; font.pixelSize: 18; font.bold: true; Layout.alignment: Qt.AlignHCenter }
        }
    }
}
