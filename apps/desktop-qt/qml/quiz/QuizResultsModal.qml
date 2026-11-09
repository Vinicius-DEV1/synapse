import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: resultsRoot
    anchors.fill: parent
    color: "#0f0e17ee"
    visible: isOpen
    z: 100

    property bool isOpen: false
    property int score: 0
    property int totalQuestions: 0

    signal returnToBatteries()
    signal restartSession()

    MouseArea { anchors.fill: parent }

    ColumnLayout {
        anchors.centerIn: parent
        spacing: 20

        Text {
            Layout.alignment: Qt.AlignHCenter
            text: "🎉 Simulado Concluído!"
            color: "#ffffff"
            font.pixelSize: 24
            font.bold: true
        }

        Text {
            Layout.alignment: Qt.AlignHCenter
            text: "Pontuação: " + resultsRoot.score + " de " + resultsRoot.totalQuestions + " acertos (" + (resultsRoot.totalQuestions > 0 ? Math.round((resultsRoot.score / resultsRoot.totalQuestions) * 100) : 0) + "%)"
            color: "#34d399"
            font.pixelSize: 16
        }

        RowLayout {
            Layout.alignment: Qt.AlignHCenter
            spacing: 12

            Button {
                text: "Voltar às Baterias"
                onClicked: resultsRoot.returnToBatteries()
            }

            Button {
                text: "Reiniciar Sessão"
                onClicked: resultsRoot.restartSession()
            }
        }
    }
}
