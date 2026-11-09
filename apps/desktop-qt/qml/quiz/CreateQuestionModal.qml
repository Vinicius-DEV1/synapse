import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: createQuestionRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: isOpen
    z: 130

    property bool isOpen: false
    property var targetBattery: null

    signal closed()
    signal questionCreated(string batteryId, string prompt, var options, int correctIndex, string explanation)

    onIsOpenChanged: {
        if (isOpen) {
            qPromptInput.text = ""
            optA.text = ""
            optB.text = ""
            optC.text = ""
            optD.text = ""
            qExplInput.text = ""
            qPromptInput.forceActiveFocus()
        }
    }

    MouseArea { anchors.fill: parent }

    Rectangle {
        anchors.centerIn: parent
        width: 520
        height: 460
        radius: 16
        color: "#161524"
        border.color: "#ffffff18"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 12

            Text {
                text: "Adicionar Questão em " + (createQuestionRoot.targetBattery ? createQuestionRoot.targetBattery.title : "Bateria")
                color: "#fffffe"
                font.pixelSize: 16
                font.bold: true
            }

            TextField {
                id: qPromptInput
                Layout.fillWidth: true
                placeholderText: "Enunciado da questão..."
                color: "#ffffff"
                background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 }
            }

            TextField { id: optA; Layout.fillWidth: true; placeholderText: "Alternativa A (Correta)..."; color: "#ffffff"; background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 } }
            TextField { id: optB; Layout.fillWidth: true; placeholderText: "Alternativa B..."; color: "#ffffff"; background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 } }
            TextField { id: optC; Layout.fillWidth: true; placeholderText: "Alternativa C..."; color: "#ffffff"; background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 } }
            TextField { id: optD; Layout.fillWidth: true; placeholderText: "Alternativa D..."; color: "#ffffff"; background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 } }

            TextField {
                id: qExplInput
                Layout.fillWidth: true
                placeholderText: "Explicação ou gabarito comentado..."
                color: "#ffffff"
                background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    text: "Cancelar"
                    Layout.fillWidth: true
                    onClicked: createQuestionRoot.closed()
                }

                Button {
                    text: "Salvar Questão"
                    Layout.fillWidth: true
                    onClicked: {
                        if (qPromptInput.text.trim().length > 0 && createQuestionRoot.targetBattery) {
                            var opts = [optA.text, optB.text, optC.text, optD.text]
                            createQuestionRoot.questionCreated(
                                createQuestionRoot.targetBattery.id,
                                qPromptInput.text.trim(),
                                opts,
                                0, // Option A correct
                                qExplInput.text.trim()
                            )
                            createQuestionRoot.closed()
                        }
                    }
                }
            }
        }
    }
}
