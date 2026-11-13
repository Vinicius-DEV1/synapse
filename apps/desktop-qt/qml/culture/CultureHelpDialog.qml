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

                Text { text: "Guia de Cultura"; color: "#fffffe"; font.pixelSize: 18; font.bold: true }

                Repeater {
                    model: [
                        { id: "overview", title: "Visão Geral" },
                        { id: "episodes", title: "Episódios & Séries" },
                        { id: "goals", title: "Metas Culturais" },
                        { id: "shortcuts", title: "Edição & Steppers" }
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
                    text: helpRoot.activeSection === "overview" ? "Catálogo Cultural e Entretenimento"
                        : helpRoot.activeSection === "episodes" ? "Gestão de Episódios e Temporadas"
                        : helpRoot.activeSection === "goals" ? "Metas Culturais e Notas Pessoais"
                        : "Edição, Steppers e Gestão Rápida"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: helpRoot.activeSection === "overview"
                        ? "O módulo de Cultura do Synapse permite catalogar e acompanhar o progresso de animes, séries e filmes. Cada obra registra pôster, tipo, sinopse, status de visualização (Assistindo, Quero Ver, Concluído) e contagem de episódios ou capítulos com persistência local em SQLite."
                        : helpRoot.activeSection === "episodes"
                        ? "Abra os detalhes de qualquer obra para gerenciar episódios individualmente. Você pode gerar a lista completa automaticamente ou adicionar episódios avulsos. Marcar um episódio como assistido (✓) atualiza instantaneamente a barra de progresso da obra e avança sua contagem."
                        : helpRoot.activeSection === "goals"
                        ? "Defina metas culturais para obras prioritárias. Você pode associar anotações de objetivos (por exemplo, assistir antes da estreia de uma nova temporada) e links externos diretos para streaming ou catálogo oficial."
                        : "Nos cartões da grade principal, use os botões rápidos (+1 Ep / -1) para atualizar seu progresso sem abrir o modal de detalhes. No modal de detalhes, use os steppers (-5, -1, +1, +5) ou conclua a obra diretamente com um clique. Use o botão ✎ para editar sinopses, capas e metas."
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

