import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: createCardRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: isOpen
    z: 130

    property bool isOpen: false
    property var deck: null
    property var editingCard: null
    readonly property bool isEditing: editingCard !== null && editingCard !== undefined
    property string selectedType: "reading"

    signal closed()
    signal cardCreated(string deckId, string front, string back, string tags, string cardType, string extraNote)
    signal cardUpdated(string cardId, string deckId, string front, string back, string tags, string cardType, string extraNote)

    onIsOpenChanged: {
        if (isOpen) {
            if (isEditing) {
                selectedType = editingCard.card_type || "reading"
                cardFrontField.text = editingCard.front || ""
                cardBackField.text = editingCard.back || ""
                cardExtraNoteField.text = editingCard.extra_note || ""
                cardTagsField.text = editingCard.tags || ""
            } else {
                selectedType = "reading"
                cardFrontField.text = ""
                cardBackField.text = ""
                cardExtraNoteField.text = ""
                cardTagsField.text = ""
            }
            cardFrontField.forceActiveFocus()
        }
    }

    MouseArea { anchors.fill: parent }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 32, 540)
        height: Math.min(parent.height - 32, 520)
        radius: 16
        color: "#161524"
        border.color: "#18ffffff"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 22
            spacing: 12

            // Header: Title & Close
            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: createCardRoot.isEditing ? "Editar Flashcard" : "Novo Flashcard"
                    color: "#fffffe"
                    font.pixelSize: 17
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Text {
                    text: createCardRoot.deck ? createCardRoot.deck.name : ""
                    color: "#818cf8"
                    font.pixelSize: 12
                    font.bold: true
                    elide: Text.ElideRight
                    Layout.maximumWidth: 200
                }
            }

            // Card Type Selector Chips
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Repeater {
                    model: [
                        { key: "reading", label: "Leitura" },
                        { key: "cloze", label: "Cloze" },
                        { key: "typing", label: "Digitação" },
                        { key: "listening", label: "Escuta" }
                    ]

                    delegate: Rectangle {
                        readonly property bool isSelected: createCardRoot.selectedType === modelData.key
                        Layout.preferredWidth: 84
                        Layout.preferredHeight: 30
                        radius: 7
                        color: isSelected ? "#312e81" : "#1a1928"
                        border.color: isSelected ? "#818cf8" : "#14ffffff"
                        border.width: 1

                        Text {
                            anchors.centerIn: parent
                            text: modelData.label
                            color: parent.isSelected ? "#ffffff" : "#a7a9be"
                            font.pixelSize: 11
                            font.bold: parent.isSelected
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: createCardRoot.selectedType = modelData.key
                        }
                    }
                }
                Item { Layout.fillWidth: true }
            }

            // Front Text Field
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: createCardRoot.selectedType === "cloze" ? "Frente (use {{c1::termo}} para lacunas)" : "Frente (Pergunta / Termo)"
                        color: "#a7a9be"
                        font.pixelSize: 11
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                    Text {
                        visible: createCardRoot.selectedType === "cloze"
                        text: "Inserir {{c1::}}"
                        color: "#818cf8"
                        font.pixelSize: 11
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                var prefix = cardFrontField.text
                                cardFrontField.text = prefix + "{{c1::resposta}}"
                            }
                        }
                    }
                }

                TextArea {
                    id: cardFrontField
                    Layout.fillWidth: true
                    Layout.preferredHeight: 76
                    placeholderText: createCardRoot.selectedType === "cloze"
                        ? "Ex: A capital do Brasil é {{c1::Brasília}}."
                        : "Digite o conteúdo da frente do cartão..."
                    color: "#ffffff"
                    wrapMode: Text.Wrap
                    font.pixelSize: 13
                    background: Rectangle {
                        color: "#0f0e17"
                        border.color: "#1affffff"
                        radius: 8
                    }
                }
            }

            // Back Text Field
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4

                Text {
                    text: createCardRoot.selectedType === "cloze" ? "Verso (Explicação opcional)" : "Verso (Resposta / Tradução)"
                    color: "#a7a9be"
                    font.pixelSize: 11
                    font.bold: true
                }

                TextArea {
                    id: cardBackField
                    Layout.fillWidth: true
                    Layout.preferredHeight: 76
                    placeholderText: createCardRoot.selectedType === "cloze"
                        ? "Explicação opcional exibida ao revelar..."
                        : "Digite a resposta do verso do cartão..."
                    color: "#ffffff"
                    wrapMode: Text.Wrap
                    font.pixelSize: 13
                    background: Rectangle {
                        color: "#0f0e17"
                        border.color: "#1affffff"
                        radius: 8
                    }
                }
            }

            // Extra Note Field
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4

                Text {
                    text: "Nota Extra (Opcional)"
                    color: "#a7a9be"
                    font.pixelSize: 11
                }

                TextField {
                    id: cardExtraNoteField
                    Layout.fillWidth: true
                    Layout.preferredHeight: 34
                    placeholderText: "Contexto adicional, exemplo de uso ou dica..."
                    color: "#ffffff"
                    font.pixelSize: 12
                    background: Rectangle {
                        color: "#0f0e17"
                        border.color: "#1affffff"
                        radius: 8
                    }
                }
            }

            // Tags Field
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4

                Text {
                    text: "Tags (Opcional)"
                    color: "#a7a9be"
                    font.pixelSize: 11
                }

                TextField {
                    id: cardTagsField
                    Layout.fillWidth: true
                    Layout.preferredHeight: 34
                    placeholderText: "Tags separadas por vírgula (ex: ingles, verbos, gramatica)..."
                    color: "#ffffff"
                    font.pixelSize: 12
                    background: Rectangle {
                        color: "#0f0e17"
                        border.color: "#1affffff"
                        radius: 8
                    }
                }
            }

            Item { Layout.fillHeight: true }

            // Action Buttons
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    text: "Cancelar"
                    Layout.fillWidth: true
                    onClicked: createCardRoot.closed()
                }

                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 40
                    radius: 8
                    color: saveCardMouse.containsMouse ? "#4f46e5" : "#6366f1"

                    Text {
                        anchors.centerIn: parent
                        text: createCardRoot.isEditing ? "Salvar Alterações" : "Criar Flashcard"
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                    }

                    MouseArea {
                        id: saveCardMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            var front = cardFrontField.text.trim()
                            var back = cardBackField.text.trim()
                            var extra = cardExtraNoteField.text.trim()
                            var tags = cardTagsField.text.trim()
                            var type = createCardRoot.selectedType

                            if (front.length > 0) {
                                if (createCardRoot.isEditing) {
                                    var cardId = createCardRoot.editingCard.id
                                    var deckId = createCardRoot.editingCard.deck_id || (createCardRoot.deck ? createCardRoot.deck.id : "")
                                    createCardRoot.cardUpdated(cardId, deckId, front, back, tags, type, extra)
                                } else if (createCardRoot.deck) {
                                    createCardRoot.cardCreated(createCardRoot.deck.id, front, back, tags, type, extra)
                                }
                                createCardRoot.closed()
                            }
                        }
                    }
                }
            }
        }
    }
}
