import QtQuick 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: bannersRoot
    Layout.fillWidth: true
    spacing: 14

    property int incorrectAttemptsCount: 0

    signal startErrorNotebookRequested()
    signal startRandomSimulationRequested()

    // Caderno de Erros Banner
    Rectangle {
        Layout.fillWidth: true
        height: 105
        radius: 12
        color: "#f43f5e0a"
        border.color: "#f43f5e25"
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
                width: 130; height: 36; radius: 8
                color: "#f43f5e"

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
                    onClicked: bannersRoot.startErrorNotebookRequested()
                }
            }
        }
    }

    // Simulado Dinâmico Banner
    Rectangle {
        Layout.fillWidth: true
        height: 105
        radius: 12
        color: "#6366f10a"
        border.color: "#6366f125"
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
                    text: "Gera um simulado aleatório com 10 questões entre todas as suas baterias."
                    color: "#94a3b8"
                    font.pixelSize: 12
                    wrapMode: Text.Wrap
                }
            }

            Rectangle {
                width: 130; height: 36; radius: 8
                color: "#6366f1"

                Text {
                    anchors.centerIn: parent
                    text: "Iniciar Simulado"
                    color: "#ffffff"
                    font.pixelSize: 12
                    font.bold: true
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: bannersRoot.startRandomSimulationRequested()
                }
            }
        }
    }
}
