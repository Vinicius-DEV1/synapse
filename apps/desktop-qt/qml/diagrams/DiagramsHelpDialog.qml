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

                Text { text: "Guia de Diagramas"; color: "#fffffe"; font.pixelSize: 18; font.bold: true }

                Repeater {
                    model: [
                        { id: "overview", title: "Lousa & Diagramas" },
                        { id: "tools", title: "Ferramentas de Desenho" },
                        { id: "crypto", title: "Criptografia E2EE" },
                        { id: "autosave", title: "Salvamento & Histórico" }
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
                    text: helpRoot.activeSection === "overview" ? "Visão Geral do Whiteboard e Diagramas"
                        : helpRoot.activeSection === "tools" ? "Ferramentas Gráficas Disponíveis"
                        : helpRoot.activeSection === "crypto" ? "Proteção Criptográfica do Conteúdo"
                        : "Salvamento Automático e Persistência"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: helpRoot.activeSection === "overview"
                        ? "O módulo de Diagramas oferece uma tela infinita com grid de pontos para criação de mapas mentais, esboços visuais, fluxogramas de raciocínio e notas livres. Todos os diagramas são armazenados de forma canônica no SQLite com timestamps de modificação."
                        : helpRoot.activeSection === "tools"
                        ? "A barra superior disponibiliza quatro ferramentas essenciais: 'Caneta' (desenho livre com traçado suavizado), 'Retângulo' (estruturação de blocos e etapas), 'Círculo' (nós de mapas mentais) e 'Nota' (criação rápida de sticky notes com fundo destacado). É possível alternar entre 6 cores pré-definidas da paleta ergonômica."
                        : helpRoot.activeSection === "crypto"
                        ? "Quando a Senha Mestre estiver ativada, o conteúdo vetorial e os textos das notas adesivas são criptografados com AES-256-GCM Two-Tier Keychain sob a chave de notas. Ao bloquear o cofre, o conteúdo dos diagramas é ocultado e a chave em memória é imediatamente descartada."
                        : "O whiteboard conta com salvamento automático incremental (autosave a cada 1,5 segundo após o término de um traço) e botão explícito 'Salvar ✓' na barra. Para retornar à galeria preservando todas as formas, clique em '← Voltar' ou utilize a tecla Esc."
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
