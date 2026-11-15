import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: setupModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    signal closeRequested()
    signal sessionConfigured(string title, string mode, string difficulty, string language, string contextNotes)

    Shortcut {
        sequence: "Escape"
        enabled: setupModalRoot.visible
        onActivated: setupModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: setupModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 640)
        height: Math.min(parent.height - 48, 540)
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    width: 32
                    height: 32
                    radius: 8
                    color: "#8b5cf6"
                    Text { anchors.centerIn: parent; text: "🎯"; font.pixelSize: 16 }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: "Configurar Sessão de Prática & Voz"
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.bold: true
                    }
                    Text {
                        text: "Defina os parâmetros para a simulação com o interlocutor IA"
                        color: "#94a1b2"
                        font.pixelSize: 12
                    }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: setupModalRoot.closeRequested()
                }
            }

            // Mode Selector
            Text { text: "Tipo de Sessão:"; color: "#d4d4d8"; font.pixelSize: 12; font.bold: true }
            ComboBox {
                id: modeCombo
                Layout.fillWidth: true
                model: ["Entrevista Técnica (Coding & System Design)", "Entrevista Comportamental (STAR)", "Conversação em Idiomas (Fluency)", "Estudo Livre & Sabatina"]
                currentIndex: 0
            }

            // Topic / Position
            Text { text: "Tópico / Vaga / Foco:"; color: "#d4d4d8"; font.pixelSize: 12; font.bold: true }
            TextField {
                id: topicInput
                Layout.fillWidth: true
                placeholderText: "Ex: Engenheiro de Software Sênior, Apresentação Comercial, Conversação Inglês..."
                color: "#fffffe"
                background: Rectangle {
                    color: "#1f1d2e"
                    radius: 8
                    border.color: topicInput.activeFocus ? "#8b5cf6" : "#2e2b44"
                }
            }

            // Row: Difficulty & Language
            RowLayout {
                Layout.fillWidth: true
                spacing: 16

                ColumnLayout {
                    Layout.fillWidth: true
                    Text { text: "Nível / Dificuldade:"; color: "#d4d4d8"; font.pixelSize: 12; font.bold: true }
                    ComboBox {
                        id: diffCombo
                        Layout.fillWidth: true
                        model: ["Iniciante / Júnior", "Intermediário / Pleno", "Avançado / Sênior", "Especialista"]
                        currentIndex: 2
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    Text { text: "Idioma de Interação:"; color: "#d4d4d8"; font.pixelSize: 12; font.bold: true }
                    ComboBox {
                        id: langCombo
                        Layout.fillWidth: true
                        model: ["Português (Brasil)", "Inglês (English)", "Espanhol (Español)", "Francês (Français)"]
                        currentIndex: 0
                    }
                }
            }

            // Context Notes / Material
            Text { text: "Contexto Adicional (opcional):"; color: "#d4d4d8"; font.pixelSize: 12; font.bold: true }
            ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true

                TextArea {
                    id: contextInput
                    placeholderText: "Cole tópicos de estudo, descrição da vaga ou critérios que o tutor deve cobrar..."
                    color: "#fffffe"
                    wrapMode: TextEdit.Wrap
                    font.pixelSize: 12
                    background: Rectangle {
                        color: "#11101a"
                        radius: 8
                        border.color: "#2e2b44"
                    }
                }
            }

            // Footer Actions
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Item { Layout.fillWidth: true }

                Button {
                    text: "Cancelar"
                    background: Rectangle { color: "#232135"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#fffffe"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: setupModalRoot.closeRequested()
                }

                Button {
                    text: "Iniciar Sessão de Voz"
                    background: Rectangle { color: "#8b5cf6"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#ffffff"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        var title = topicInput.text.trim().length > 0 ? topicInput.text.trim() : modeCombo.currentText
                        setupModalRoot.sessionConfigured(
                            title,
                            modeCombo.currentText,
                            diffCombo.currentText,
                            langCombo.currentText,
                            contextInput.text.trim()
                        )
                        setupModalRoot.closeRequested()
                    }
                }
            }
        }
    }
}
