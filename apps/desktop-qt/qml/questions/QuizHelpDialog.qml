import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: helpRoot
    anchors.fill: parent
    color: "#d90f0e17"
    visible: helpRoot.isOpen
    z: 190

    property bool isOpen: false
    property string activeSection: "batteries"

    signal closed()

    MouseArea { anchors.fill: parent }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 36, 820)
        height: Math.min(parent.height - 36, 600)
        radius: 18
        color: "#161524"
        border.color: "#18ffffff"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 24

            ColumnLayout {
                Layout.preferredWidth: 190
                Layout.fillHeight: true
                spacing: 12

                Text { text: "Guia de questões"; color: "#fffffe"; font.pixelSize: 18; font.bold: true }

                Repeater {
                    model: [
                        { id: "batteries", title: "Baterias" },
                        { id: "simulation", title: "Simulados" },
                        { id: "review", title: "Revisão" },
                        { id: "shortcuts", title: "Atalhos" }
                    ]

                    delegate: Button {
                        Layout.fillWidth: true
                        text: modelData.title
                        highlighted: helpRoot.activeSection === modelData.id
                        onClicked: helpRoot.activeSection = modelData.id
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
                    text: helpRoot.activeSection === "batteries" ? "Criar e organizar baterias"
                        : helpRoot.activeSection === "simulation" ? "Configurar um simulado"
                        : helpRoot.activeSection === "review" ? "Revisar erros e acompanhar resultados"
                        : "Atalhos de teclado"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: helpRoot.activeSection === "batteries"
                        ? "Use Nova Bateria para criar um conjunto de questões ou o ícone ✏️ para renomear e editar título e descrição. Clique no cartão ou no ícone 📋 para inspecionar todas as questões da bateria em um modal detalhado, onde é possível conferir alternativas, gabarito, tags, editar enunciados (✏️) ou excluir questões (🗑️). Abra o botão + para cadastrar novas questões com quatro alternativas, gabarito, explicação e tags no banco local."
                        : helpRoot.activeSection === "simulation"
                        ? "Abra Configurar no cartão Simulado Dinâmico. Selecione uma ou mais tags para restringir a sessão; sem tags, todas as questões compatíveis ficam elegíveis. Filtre por todas, sem resposta ou erros, escolha 5, 10, 20, 30 ou 50 questões e ative ou desative o embaralhamento. A sessão usa somente questões salvas."
                        : helpRoot.activeSection === "review"
                        ? "O Caderno de Erros mostra questões de múltipla escolha cuja resposta mais recente foi incorreta. Ao acertar uma questão numa nova tentativa, ela sai da revisão. Ao concluir uma sessão, consulte o aproveitamento e o resultado de cada questão. Selecione uma questão para revisar o gabarito; sair da revisão retorna ao resumo."
                        : "Durante a sessão: A, B, C, D ou 1, 2, 3, 4 selecionam uma alternativa; Enter ou Espaço confirma e avança; G mostra ou oculta o gabarito; Esc sai da sessão ou retorna ao resumo durante a revisão."
                    color: "#c4c4d0"
                    font.pixelSize: 14
                    wrapMode: Text.Wrap
                    lineHeight: 1.5
                    verticalAlignment: Text.AlignTop
                }

                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 1
                    color: "#0fffffff"
                }

                Text {
                    Layout.fillWidth: true
                    text: "As sessões nativas atualmente aceitam questões de múltipla escolha."
                    color: "#7c7c8b"
                    font.pixelSize: 11
                    wrapMode: Text.Wrap
                }
            }
        }
    }
}
