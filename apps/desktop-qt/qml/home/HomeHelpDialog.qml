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

                Text { text: "Guia da Tela Inicial"; color: "#fffffe"; font.pixelSize: 18; font.bold: true }

                Repeater {
                    model: [
                        { id: "overview", title: "Dashboard Inicial" },
                        { id: "quick_actions", title: "Ações Rápidas" },
                        { id: "agenda", title: "Agenda de Compromissos" },
                        { id: "notes", title: "Notas Recentes & Fixadas" }
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
                    text: helpRoot.activeSection === "overview" ? "Visão Geral do Painel Home"
                        : helpRoot.activeSection === "quick_actions" ? "Barra de Ações Rápidas"
                        : helpRoot.activeSection === "agenda" ? "Agenda de Hoje e Próximos Eventos"
                        : "Acesso a Notas Recentes e Fixadas"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: helpRoot.activeSection === "overview"
                        ? "A Tela Inicial (Home) funciona como seu centro de comando diário no Synapse. Ela consolida em uma única visualização elegante sua saudação contextual pelo horário, compromissos da agenda para hoje e amanhã, atalhos de navegação para os módulos principais e páginas recentemente editadas ou fixadas."
                        : helpRoot.activeSection === "quick_actions"
                        ? "Localizados no topo do painel, os 4 botões de ação rápida permitem criar novas páginas de anotações instantaneamente, abrir a visualização completa do calendário, acessar os baralhos de flashcards com indicador de revisões pendentes (SRS) ou navegar diretamente para o gerenciador de arquivos e biblioteca."
                        : helpRoot.activeSection === "agenda"
                        ? "O cartão 'Eventos de Hoje' lista seus compromissos, tarefas e lembretes programados com código de cores e status de conclusão. Quando sua agenda estiver livre, o cartão exibe uma mensagem de tranquilidade. Eventos agendados para amanhã aparecem em um resumo logo abaixo."
                        : "No painel lateral à direita, o bloco 'Recentes' mantém o histórico das últimas páginas modificadas no editor. O bloco 'Notas Fixadas' exibe seus documentos essenciais marcados como favoritos, permitindo retomada imediata de projetos e estudos com um clique."
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
