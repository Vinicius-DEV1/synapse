import QtQuick 2.15
import QtQuick.Layouts 1.15

GridLayout {
    id: kpiGridRoot
    Layout.fillWidth: true
    columns: 4
    columnSpacing: 14
    rowSpacing: 14

    property var quizStats: ({})

    // Total Questions
    Rectangle {
        Layout.fillWidth: true
        height: 90
        radius: 12
        color: "#161524"
        border.color: "#ffffff0f"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 14
            spacing: 4
            Text { text: "TOTAL DE QUESTÕES"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
            Text { text: (kpiGridRoot.quizStats.total_questions || 0).toString(); color: "#fffffe"; font.pixelSize: 22; font.bold: true }
            Text { text: "em " + (kpiGridRoot.quizStats.total_batteries || 0) + " baterias"; color: "#64748b"; font.pixelSize: 11 }
        }
    }

    // Answered Attempts
    Rectangle {
        Layout.fillWidth: true
        height: 90
        radius: 12
        color: "#161524"
        border.color: "#ffffff0f"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 14
            spacing: 4
            Text { text: "RESPONDIDAS"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
            Text { text: (kpiGridRoot.quizStats.total_attempts || 0).toString(); color: "#38bdf8"; font.pixelSize: 22; font.bold: true }
            Text { text: "tentativas registradas"; color: "#64748b"; font.pixelSize: 11 }
        }
    }

    // Accuracy Rate
    Rectangle {
        Layout.fillWidth: true
        height: 90
        radius: 12
        color: "#161524"
        border.color: "#ffffff0f"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 14
            spacing: 4
            Text { text: "TAXA DE ACERTO"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
            Text { text: (kpiGridRoot.quizStats.accuracy_rate || 0) + "%"; color: "#34d399"; font.pixelSize: 22; font.bold: true }
            Text { text: (kpiGridRoot.quizStats.correct_attempts || 0) + " respostas corretas"; color: "#64748b"; font.pixelSize: 11 }
        }
    }

    // Mistakes to review
    Rectangle {
        Layout.fillWidth: true
        height: 90
        radius: 12
        color: "#161524"
        border.color: "#ffffff0f"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 14
            spacing: 4
            Text { text: "ERROS A REVISAR"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 1 }
            Text { text: (kpiGridRoot.quizStats.incorrect_attempts || 0).toString(); color: "#fb7185"; font.pixelSize: 22; font.bold: true }
            Text { text: "no caderno de erros"; color: "#64748b"; font.pixelSize: 11 }
        }
    }
}
