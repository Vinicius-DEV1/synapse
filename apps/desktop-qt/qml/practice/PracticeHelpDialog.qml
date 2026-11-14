import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: helpRoot
    anchors.fill: parent
    color: "#d90f0e17"
    visible: helpRoot.isOpen
    z: 220

    property bool isOpen: false
    property string activeSection: "overview"

    signal closed()

    MouseArea { anchors.fill: parent }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 36, 800)
        height: Math.min(parent.height - 36, 580)
        radius: 18
        color: "#161524"
        border.color: "#18ffffff"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 24

            ColumnLayout {
                Layout.preferredWidth: 200
                Layout.fillHeight: true
                spacing: 12

                Text { text: "Guia de Prática & IA"; color: "#fffffe"; font.pixelSize: 18; font.bold: true }

                Repeater {
                    model: [
                        { id: "overview", title: "Tutor de Prática & IA" },
                        { id: "sessions", title: "Sessões & Entrevistas" },
                        { id: "memories", title: "Memórias de Longo Prazo" },
                        { id: "prompts", title: "Prompts & Contexto" }
                    ]

                    delegate: Button {
                        id: navBtn
                        property var itemData: modelData
                        Layout.fillWidth: true
                        text: navBtn.itemData.title
                        highlighted: helpRoot.activeSection === navBtn.itemData.id
                        onClicked: helpRoot.activeSection = navBtn.itemData.id
                    }
                }

                Item { Layout.fillHeight: true }

                Button {
                    Layout.fillWidth: true
                    text: "Fechar"
                    onClicked: helpRoot.closed()
                }
            }

            Rectangle { Layout.fillHeight: true; Layout.preferredWidth: 1; color: "#0fffffff" }

            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 14

                Text {
                    text: helpRoot.activeSection === "overview" ? "Visão Geral do Tutor de Prática"
                        : helpRoot.activeSection === "sessions" ? "Sessões e Simulação de Entrevista"
                        : helpRoot.activeSection === "memories" ? "Memórias de Longo Prazo do Tutor"
                        : "Prompts Customizados e Contexto"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: helpRoot.activeSection === "overview"
                        ? "O módulo de Prática funciona como seu ambiente interativo de estudos guiados e preparação para entrevistas. Todas as conversas são organizadas por sessões persistidas canonicamente no banco SQLite, com histórico completo de transcrição e suporte a memórias contextuais."
                        : helpRoot.activeSection === "sessions"
                        ? "Crie sessões livres de estudo, sessões temáticas de idiomas ou simulações de entrevistas técnicas clicando em '+ Nova Sessão'. Cada sessão preserva seu próprio histórico cronológico de perguntas e respostas. Para remover uma sessão descartada, utilize o botão 🗑️ na lista lateral."
                        : helpRoot.activeSection === "memories"
                        ? "O painel de Memórias (🧠) permite registrar fatos e preferências persistentes que orientam o comportamento do tutor entre diferentes sessões (por exemplo: nível de senioridade, linguagem de programação preferida ou áreas de maior dificuldade)."
                        : "Ao configurar uma sessão com prompt personalizado, as instruções de sistema definem a persona e o tom de avaliação do tutor. Pressione Enter para enviar suas mensagens ou Esc a qualquer momento para fechar as janelas contextuais."
                    color: "#c4c4d0"
                    font.pixelSize: 14
                    wrapMode: Text.Wrap
                    lineHeight: 1.5
                    verticalAlignment: Text.AlignTop
                }
            }
        }
    }
}

