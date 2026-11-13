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
    property string activeSection: "overview"

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

                Text { text: "Guia do Calendário"; color: "#fffffe"; font.pixelSize: 18; font.bold: true }

                Repeater {
                    model: [
                        { id: "overview", title: "Visão Geral" },
                        { id: "types", title: "Tipos de Item" },
                        { id: "grid", title: "Grade & Agenda" },
                        { id: "status", title: "Status & Edição" }
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
                    text: helpRoot.activeSection === "overview" ? "Planejamento e Agenda Pessoal"
                        : helpRoot.activeSection === "types" ? "Eventos, Tarefas e Lembretes"
                        : helpRoot.activeSection === "grid" ? "Navegação Mensal e Modo Lista"
                        : "Conclusão, Edição e Persistência"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: helpRoot.activeSection === "overview"
                        ? "O módulo de Calendário do Synapse centraliza seus compromissos, tarefas com prazo e lembretes em uma interface ágil e integrada. Todos os registros são sincronizados e armazenados localmente na base SQLite protegida, com suporte a cores e datas ISO-8601 completas."
                        : helpRoot.activeSection === "types"
                        ? "Você pode categorizar cada agendamento em três tipos essenciais:\n\n• 📅 Evento: compromissos com horário marcado (reuniões, consultas, aulas).\n• ✓ Tarefa: afazeres e obrigações que requerem entrega ou execução.\n• 🔔 Lembrete: avisos e recordatórios pontuais para não esquecer detalhes cruciais."
                        : helpRoot.activeSection === "grid"
                        ? "Alterne instantaneamente entre duas visões no cabeçalho:\n\n• 📅 Mês: grade visual mensal completa com destaque para o dia atual e indicador de eventos por data. Clique em qualquer dia para abrir o agendador direto naquela data.\n• 📋 Lista: visualização sequencial detalhada em formato de agenda, ideal para revisar compromissos dos próximos dias."
                        : "No modo lista, clique no pill de status (Pendente / Concluído) para alternar o estado do compromisso sem abrir formulários. Use o botão ✎ para ajustar horários, notas e cores, ou 🗑️ para mover o evento para a lixeira."
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

