import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: headerRoot
    property string activeModel: ""
    property bool hasHistory: false

    signal clearRequested()
    signal closeRequested()

    Layout.fillWidth: true
    Layout.preferredHeight: 76
    color: "#241934"
    border.color: "#4c1d95"

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 22
        anchors.rightMargin: 14
        spacing: 12

        Rectangle {
            Layout.preferredWidth: 42
            Layout.preferredHeight: 42
            radius: 14
            color: "#338b5cf6"
            border.color: "#598b5cf6"
            Text { anchors.centerIn: parent; text: "✦"; color: "#c4b5fd"; font.pixelSize: 20 }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 3
            RowLayout {
                spacing: 8
                Text {
                    text: qsTr("Assistente de IA para Exercícios")
                    color: "#ffffff"
                    font.pixelSize: 15
                    font.bold: true
                }
                Text {
                    visible: headerRoot.activeModel.length > 0
                    text: "Gemini AI · " + headerRoot.activeModel
                    color: "#c4b5fd"
                    font.pixelSize: 10
                }
            }
            Text {
                text: qsTr("Tire dúvidas sobre a questão e sua avaliação")
                color: "#c4b5fd"
                opacity: 0.75
                font.pixelSize: 11
            }
        }

        Button {
            visible: headerRoot.hasHistory
            text: qsTr("Limpar histórico")
            onClicked: headerRoot.clearRequested()
        }
        Button {
            text: "✕"
            onClicked: headerRoot.closeRequested()
        }
    }
}
