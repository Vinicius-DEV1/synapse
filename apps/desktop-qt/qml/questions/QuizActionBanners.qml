import QtQuick 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: bannersRoot
    Layout.fillWidth: true
    spacing: 14

    property int incorrectAttemptsCount: 0
    property int totalQuestions: 0

    signal startErrorNotebookRequested()
    signal openSimulationBuilderRequested()

    // Caderno de Erros Banner
    Rectangle {
        Layout.fillWidth: true
        Layout.preferredHeight: 105
        radius: 12
        color: "#0af43f5e"
        border.color: "#25f43f5e"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 14

            Text { text: "📕"; font.pixelSize: 32 }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3
                Text { text: "Caderno de Erros"; color: "#fda4af"; font.pixelSize: 15; font.bold: true }
                Text {
                    Layout.fillWidth: true
                    text: "Revise especificamente as questões com erros recentes para consolidar o aprendizado."
                    color: "#94a3b8"
                    font.pixelSize: 12
                    wrapMode: Text.Wrap
                }
            }

            Rectangle {
                Layout.preferredWidth: 130
                Layout.preferredHeight: 36
                radius: 8
                color: "#f43f5e"
                opacity: bannersRoot.incorrectAttemptsCount > 0 ? 1 : 0.45

                Text {
                    anchors.centerIn: parent
                    text: "Revisar (" + bannersRoot.incorrectAttemptsCount + ")"
                    color: "#ffffff"
                    font.pixelSize: 12
                    font.bold: true
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    enabled: bannersRoot.incorrectAttemptsCount > 0
                    onClicked: bannersRoot.startErrorNotebookRequested()
                }
            }
        }
    }

    // Simulado Dinâmico Banner
    Rectangle {
        Layout.fillWidth: true
        Layout.preferredHeight: 105
        radius: 12
        color: "#0a6366f1"
        border.color: "#256366f1"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 14

            Text { text: "⚡"; font.pixelSize: 32 }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3
                Text { text: "Simulado Dinâmico"; color: "#c7d2fe"; font.pixelSize: 15; font.bold: true }
                Text {
                    Layout.fillWidth: true
                    text: "Filtre as questões por tags e progresso, escolha a quantidade e inicie o simulado."
                    color: "#94a3b8"
                    font.pixelSize: 12
                    wrapMode: Text.Wrap
                }
            }

            Rectangle {
                Layout.preferredWidth: 130
                Layout.preferredHeight: 36
                radius: 8
                color: "#6366f1"
                opacity: bannersRoot.totalQuestions > 0 ? 1 : 0.45

                Text {
                    anchors.centerIn: parent
                    text: "Configurar"
                    color: "#ffffff"
                    font.pixelSize: 12
                    font.bold: true
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    enabled: bannersRoot.totalQuestions > 0
                    onClicked: bannersRoot.openSimulationBuilderRequested()
                }
            }
        }
    }
}
