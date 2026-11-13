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
        width: Math.min(parent.width - 36, 780)
        height: Math.min(parent.height - 36, 560)
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

                Text { text: "Guia de Notificações"; color: "#fffffe"; font.pixelSize: 18; font.bold: true }

                Repeater {
                    model: [
                        { id: "overview", title: "Central de Notificações" },
                        { id: "actions", title: "Ações & Integrações" },
                        { id: "filters", title: "Filtros & Navegação" },
                        { id: "cleanup", title: "Gestão & Limpeza" }
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
                    text: helpRoot.activeSection === "overview" ? "Central de Notificações Unificada"
                        : helpRoot.activeSection === "actions" ? "Ações Diretas nos Cards"
                        : helpRoot.activeSection === "filters" ? "Filtros Rápidos por Categoria"
                        : "Leitura e Limpeza Segura"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: helpRoot.activeSection === "overview"
                        ? "A Central de Notificações do Synapse reúne alertas do sistema, lembretes agendados e eventos de calendário em um painel unificado acessível pelo sino no cabeçalho superior. A contagem de mensagens não lidas é sincronizada dinamicamente em tempo real com o banco SQLite. Pressione Esc a qualquer momento para fechar o painel."
                        : helpRoot.activeSection === "actions"
                        ? "Cada notificação oferece ações contextuais inteligentes: se vinculada a um evento de calendário, o botão 'Concluir' marca a tarefa correspondente como concluída e arquiva a notificação; o botão 'Adiar 15 min' reagenda o lembrete automaticamente; e o botão 'Abrir nota' direciona imediatamente para o documento associado."
                        : helpRoot.activeSection === "filters"
                        ? "Utilize as abas de filtragem no topo da lista para alternar entre: 'Todas' (histórico completo de até 100 notificações), 'Não Lidas' (pendentes de atenção), 'Eventos' (compromissos e tarefas do calendário) e 'Alarmes' (sessões de foco e despertadores programados)."
                        : "Marque notificações individualmente como lidas clicando no ícone ✓, ou utilize o botão 'Marcar lidas' no cabeçalho para zerar todas as pendências em lote. Notificações descartadas ou removidas com 'Limpar tudo' utilizam exclusão lógica (soft delete) no SQLite."
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

