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

                Text { text: "Guia de Foco"; color: "#fffffe"; font.pixelSize: 18; font.bold: true }

                Repeater {
                    model: [
                        { id: "overview", title: "Pomodoro & Foco" },
                        { id: "lofi", title: "Trilhas Lo-Fi" },
                        { id: "sessions", title: "Histórico & Metas" },
                        { id: "alarms", title: "Alarmes & Rotina" }
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
                    text: helpRoot.activeSection === "overview" ? "Técnica Pomodoro e Ciclos de Foco"
                        : helpRoot.activeSection === "lofi" ? "Trilhas Sonoras e Imersão Acústica"
                        : helpRoot.activeSection === "sessions" ? "Registro e Estatísticas Diárias"
                        : "Alarmes Programados e Pontualidade"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: helpRoot.activeSection === "overview"
                        ? "O cronômetro Pomodoro do Synapse auxilia no gerenciamento do tempo dividindo o estudo em blocos de alta concentração intercalados por pausas curtas. Escolha entre os presets rápidos (25 min, 15 min, 50 min) ou defina um tempo customizado através do modal de tempo livre."
                        : helpRoot.activeSection === "lofi"
                        ? "O painel lateral de Lo-Fi oferece reprodução de faixas ambientais para supressão de ruído e estímulo cognitivo durante sessões de foco. O player global permite controlar o áudio de qualquer lugar do aplicativo sem interromper seu fluxo de trabalho."
                        : helpRoot.activeSection === "sessions"
                        ? "Ao concluir cada bloco de foco, a sessão é registrada localmente no banco SQLite com a tag escolhida (Estudo, Trabalho, Leitura, etc.). Os totais de minutos e sessões do dia são recalculados em tempo real nos cartões superiores."
                        : "Configure alarmes sonoros com horários exatos e rótulos personalizados para marcar o início de blocos de estudo, pausas ou compromissos. Cada alarme pode ser ativado ou desativado individualmente pelo painel."
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

