import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: completionRoot
    Layout.fillWidth: true
    height: 360
    radius: 16
    color: "#1a1924"
    border.color: "#12ffffff"

    property int cardsReviewedCount: 0

    signal returnToDecksRequested()
    signal extraStudyRequested()

    ColumnLayout {
        anchors.centerIn: parent
        spacing: 16

        Text { Layout.alignment: Qt.AlignHCenter; text: "🎉"; font.pixelSize: 48 }
        Text {
            Layout.alignment: Qt.AlignHCenter
            text: "Parabéns! Sessão de Estudos Concluída"
            color: "#fffffe"
            font.pixelSize: 20
            font.bold: true
        }
        Text {
            Layout.alignment: Qt.AlignHCenter
            text: completionRoot.cardsReviewedCount > 0
                ? "Você revisou " + completionRoot.cardsReviewedCount + " cartão(ões) hoje de acordo com o algoritmo FSRS v5."
                : "Todos os cartões deste baralho estão em dia! Nenhum cartão pendente agora."
            color: "#a7a9be"
            font.pixelSize: 14
        }

        Item { height: 12 }

        RowLayout {
            Layout.alignment: Qt.AlignHCenter
            spacing: 12

            Rectangle {
                width: 180
                height: 42
                radius: 10
                color: "#6366f1"

                Text {
                    anchors.centerIn: parent
                    text: "Voltar aos Baralhos"
                    color: "#ffffff"
                    font.pixelSize: 14
                    font.bold: true
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: completionRoot.returnToDecksRequested()
                }
            }

            Rectangle {
                width: 190
                height: 42
                radius: 10
                color: "#1f1d2e"
                border.color: "#38354d"

                Text {
                    anchors.centerIn: parent
                    text: qsTr("Estudo Extra (Todos)")
                    color: "#c4b5fd"
                    font.pixelSize: 13
                    font.bold: true
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: completionRoot.extraStudyRequested()
                }
            }
        }
    }
}
