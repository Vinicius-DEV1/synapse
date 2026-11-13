import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: helpDialog
    modal: true
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 880)
    height: Math.min(parent.height - 32, 600)
    padding: 0
    closePolicy: Popup.CloseOnEscape
    standardButtons: Dialog.NoButton

    property bool isOpen: false
    signal dismissRequested()

    readonly property var groups: [
        {
            title: "Sessão de estudo",
            entries: [
                { action: "Revelar resposta / verso", keys: "Espaço  ·  Enter" },
                { action: "Avaliar: Errei (reaprender)", keys: "1" },
                { action: "Avaliar: Difícil", keys: "2" },
                { action: "Avaliar: Bom", keys: "3" },
                { action: "Avaliar: Fácil", keys: "4" },
                { action: "Sair do estudo", keys: "Esc" }
            ]
        },
        {
            title: "Tipos de cartões",
            entries: [
                { action: "Leitura (Padrão)", keys: "Pergunta e resposta padrão" },
                { action: "Completar Frase (Cloze)", keys: "{{c1::resposta}} na frente" },
                { action: "Digitação Livre", keys: "Comparação de acerto digitado" },
                { action: "Escuta (Áudio)", keys: "Compreensão auditiva" }
            ]
        },
        {
            title: "Navegador e baralhos",
            entries: [
                { action: "Criar novo cartão", keys: "Navegador  ›  + Novo Cartão" },
                { action: "Editar cartão existente", keys: "Navegador  ›  Clique ou ✏️" },
                { action: "Buscar por frente, verso ou tags", keys: "Navegador  ›  Barra de busca" },
                { action: "Filtrar por tipo de cartão", keys: "Pills Todos, Leitura, Cloze, etc." },
                { action: "Criar sub-baralho hierárquico", keys: "Menu do baralho  ›  + Sub-baralho" },
                { action: "Ajustes e reset de progresso", keys: "Navegador  ›  Ajustes" }
            ]
        },
        {
            title: "Algoritmo FSRS",
            entries: [
                { action: "Estabilidade (S)", keys: "Intervalo previsto de retenção" },
                { action: "Dificuldade (D)", keys: "Grau de esforço da memória (1–10)" },
                { action: "Agendamento determinístico", keys: "Cálculos nativos em Rust FSRSv4" },
                { action: "Estatísticas globais", keys: "Cabeçalho  ›  Estatísticas" }
            ]
        }
    ]

    onIsOpenChanged: {
        if (isOpen) open()
        else close()
    }
    onClosed: dismissRequested()

    background: Rectangle { color: "#181720"; radius: 16; border.color: "#10ffffff" }

    header: Rectangle {
        implicitHeight: 74
        color: "#08ffffff"
        radius: 16
        Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: "#0cffffff" }
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 20
            anchors.rightMargin: 12
            spacing: 12
            Rectangle {
                Layout.preferredWidth: 40
                Layout.preferredHeight: 40
                radius: 10
                color: "#1a818cf8"
                border.color: "#33818cf8"
                Text { anchors.centerIn: parent; text: "⚡"; color: "#a5b4fc"; font.pixelSize: 20 }
            }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2
                Label { text: "Guia de Flashcards & FSRS"; color: "#f4f4f5"; font.pixelSize: 16; font.bold: true }
                Label { text: "Atalhos de estudo, tipos de cartões e repetição espaçada nativa"; color: "#9293a5"; font.pixelSize: 11 }
            }
            ToolButton {
                id: closeButton
                text: "×"
                Accessible.name: "Fechar guia"
                onClicked: helpDialog.close()
                contentItem: Text { text: closeButton.text; color: "#a7a9be"; font.pixelSize: 24; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
    }

    contentItem: ScrollView {
        clip: true
        contentWidth: availableWidth
        GridLayout {
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.margins: 20
            columns: 2
            columnSpacing: 24
            rowSpacing: 20
            Repeater {
                model: helpDialog.groups
                delegate: ColumnLayout {
                    Layout.fillWidth: true
                    Layout.alignment: Qt.AlignTop
                    spacing: 8
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8
                        Rectangle { Layout.preferredWidth: 3; Layout.preferredHeight: 15; radius: 2; color: "#818cf8" }
                        Label { Layout.fillWidth: true; text: modelData.title; color: "#c7d2fe"; font.pixelSize: 13; font.bold: true }
                    }
                    Repeater {
                        model: modelData.entries
                        delegate: RowLayout {
                            Layout.fillWidth: true
                            spacing: 10
                            Label {
                                Layout.fillWidth: true
                                text: modelData.action
                                color: "#e4e4e7"
                                font.pixelSize: 11
                                wrapMode: Text.Wrap
                            }
                            Label {
                                text: modelData.keys
                                color: "#a5b4fc"
                                font.pixelSize: 10
                                font.family: "monospace"
                                horizontalAlignment: Text.AlignRight
                                wrapMode: Text.Wrap
                            }
                        }
                    }
                }
            }
        }
    }
}
