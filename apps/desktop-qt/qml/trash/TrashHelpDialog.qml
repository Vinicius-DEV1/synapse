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

                Text { text: "Guia da Lixeira"; color: "#fffffe"; font.pixelSize: 18; font.bold: true }

                Repeater {
                    model: [
                        { id: "overview", title: "Lixeira do Sistema" },
                        { id: "restore", title: "Restauração de Itens" },
                        { id: "purge", title: "Exclusão Permanente" },
                        { id: "filters", title: "Filtros & Categorias" }
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
                    text: helpRoot.activeSection === "overview" ? "Visão Geral da Lixeira do Sistema"
                        : helpRoot.activeSection === "restore" ? "Restauração e Integridade de Dados"
                        : helpRoot.activeSection === "purge" ? "Exclusão Permanente e Esvaziamento"
                        : "Filtros Rápidos e Busca por Título"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: helpRoot.activeSection === "overview"
                        ? "A Lixeira do Synapse centraliza todos os itens excluídos de forma segura (soft delete). Ao remover páginas de anotações, baralhos de flashcards, livros da biblioteca, arquivos criptografados, transações financeiras, metas culturais ou hábitos, os dados permanecem protegidos no banco de dados local com o registro de data de exclusão (deleted_at), permitindo recuperação imediata."
                        : helpRoot.activeSection === "restore"
                        ? "Para recuperar qualquer item descartado, clique no botão 'Restaurar' (↩) na lista. O Synapse remove a flag de exclusão lógica (deleted_at = NULL) e atualiza o timestamp do registro. O item reaparece instantaneamente em seu módulo de origem, preservando notas associadas, histórico, anexos e vínculos de calendário sem perda de dados."
                        : helpRoot.activeSection === "purge"
                        ? "Se você deseja liberar espaço ou descartar dados definitivamente, clique no ícone de lixeira individual (🗑️) para apagar o registro permanentemente do SQLite. Para descartar todo o conteúdo da lixeira de uma só vez, utilize o botão 'Esvaziar Lixeira' no cabeçalho; uma caixa de diálogo solicitará sua confirmação antes de realizar a exclusão física irreversível."
                        : "A barra de filtros permite isolar itens específicos por categoria: Todas, Notas, Baralhos, Livros, Cofre, Finanças, Arquivos, Hábitos, Cultura e Agenda. A barra de busca ao lado filtra os resultados em tempo real à medida que você digita, facilitando localizar rapidamente qualquer item pelo título."
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
