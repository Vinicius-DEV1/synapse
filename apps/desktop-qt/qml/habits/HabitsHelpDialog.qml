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

                Text { text: "Guia de Hábitos"; color: "#fffffe"; font.pixelSize: 18; font.bold: true }

                Repeater {
                    model: [
                        { id: "overview", title: "Consistência" },
                        { id: "matrix", title: "Matriz 7 Dias" },
                        { id: "goals", title: "Metas Semanais" },
                        { id: "shortcuts", title: "Edição & Gestão" }
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
                    text: helpRoot.activeSection === "overview" ? "Construção de Hábitos e Consistência"
                        : helpRoot.activeSection === "matrix" ? "Matriz Visual dos Últimos 7 Dias"
                        : helpRoot.activeSection === "goals" ? "Metas Semanais Personalizadas"
                        : "Edição, Personalização e Exclusão"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: helpRoot.activeSection === "overview"
                        ? "O módulo de hábitos do Synapse permite transformar pequenos comportamentos em rotinas consistentes. Cada hábito possui um título, um ícone temático e uma cor personalizada que acompanha suas execuções diárias. Todos os check-ins são salvos localmente no SQLite com histórico completo."
                        : helpRoot.activeSection === "matrix"
                        ? "A matriz exibe os últimos 7 dias da semana com destaque visual para o dia atual (círculo com contorno destacado). Para registrar ou desfazer a conclusão de um hábito em qualquer dia da semana, basta clicar no círculo correspondente. O check-in alterna entre concluído (✓ com a cor do hábito) e pendente."
                        : helpRoot.activeSection === "goals"
                        ? "Ao criar ou editar um hábito, defina a meta semanal de dias ativos (de 3 a 7 dias por semana). Isso permite flexibilidade para hábitos que não necessitam ser executados todos os dias (como treinos em dias alternados ou revisões específicas)."
                        : "Use o botão ✏️ no cartão do hábito para renomear, trocar o ícone representativo, atualizar a cor ou redefinir a meta semanal. O botão 🗑️ remove o hábito após confirmação, preservando o histórico de integridade da base."
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
                    text: "Os registros de check-in utilizam transações atômicas seguras no banco SQLite local."
                    color: "#7c7c8b"
                    font.pixelSize: 11
                    wrapMode: Text.Wrap
                }
            }
        }
    }
}

