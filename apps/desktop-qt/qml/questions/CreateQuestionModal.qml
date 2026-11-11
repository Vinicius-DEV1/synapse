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
    signal questionCreated(string batteryId, string prompt, var options, int correctIndex, string explanation, var tags)

    onIsOpenChanged: {
        if (isOpen) {
            qPromptInput.text = ""
            optA.text = ""
            optB.text = ""
            optC.text = ""
            optD.text = ""
            correctOptionSelector.currentIndex = 0
            qExplInput.text = ""
            qTagsInput.text = ""
            qPromptInput.forceActiveFocus()
        }
    }

    MouseArea { anchors.fill: parent }

    function isFormValid() {
        return Boolean(targetBattery)
            && qPromptInput.text.trim().length > 0
            && optA.text.trim().length > 0
            && optB.text.trim().length > 0
            && optC.text.trim().length > 0
            && optD.text.trim().length > 0
    }

    Rectangle {
        anchors.centerIn: parent
        width: 520
        height: 540
        radius: 16
        color: "#161524"
        border.color: "#18ffffff"
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
                background: Rectangle { color: "#0f0e17"; border.color: "#1affffff"; radius: 8 }
            }

            TextField { id: optA; Layout.fillWidth: true; placeholderText: "Alternativa A (Correta)..."; color: "#ffffff"; background: Rectangle { color: "#0f0e17"; border.color: "#1affffff"; radius: 8 } }
            TextField { id: optB; Layout.fillWidth: true; placeholderText: "Alternativa B..."; color: "#ffffff"; background: Rectangle { color: "#0f0e17"; border.color: "#1affffff"; radius: 8 } }
            TextField { id: optC; Layout.fillWidth: true; placeholderText: "Alternativa C..."; color: "#ffffff"; background: Rectangle { color: "#0f0e17"; border.color: "#1affffff"; radius: 8 } }
            TextField { id: optD; Layout.fillWidth: true; placeholderText: "Alternativa D..."; color: "#ffffff"; background: Rectangle { color: "#0f0e17"; border.color: "#1affffff"; radius: 8 } }

            Text { text: "Alternativa correta"; color: "#d4d4d8"; font.pixelSize: 11 }
            ComboBox {
                id: correctOptionSelector
                Layout.fillWidth: true
                model: ["A", "B", "C", "D"]
            }

            TextField {
                id: qExplInput
                Layout.fillWidth: true
                placeholderText: "Explicação ou gabarito comentado..."
                color: "#ffffff"
                background: Rectangle { color: "#0f0e17"; border.color: "#1affffff"; radius: 8 }
            }

            TextField {
                id: qTagsInput
                Layout.fillWidth: true
                placeholderText: "Tags separadas por vírgula..."
                color: "#ffffff"
                background: Rectangle { color: "#0f0e17"; border.color: "#1affffff"; radius: 8 }
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
                    enabled: createQuestionRoot.isFormValid()
                    onClicked: {
                        if (createQuestionRoot.isFormValid()) {
                            var opts = [optA.text, optB.text, optC.text, optD.text]
                            var tags = qTagsInput.text.split(",")
                            for (var i = 0; i < tags.length; ++i) tags[i] = tags[i].trim()
                            tags = tags.filter(function(tag) { return tag.length > 0 })
                            createQuestionRoot.questionCreated(
                                createQuestionRoot.targetBattery.id,
                                qPromptInput.text.trim(),
                                opts,
                                correctOptionSelector.currentIndex,
                                qExplInput.text.trim(),
                                tags
                            )
                            createQuestionRoot.closed()
                        }
                    }
                }
            }
        }
    }
}
