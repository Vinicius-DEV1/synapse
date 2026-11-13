import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: helpDialog
    modal: true
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 900)
    height: Math.min(parent.height - 32, 620)
    padding: 0
    closePolicy: Popup.CloseOnEscape
    standardButtons: Dialog.NoButton

    property bool isOpen: false
    signal dismissRequested()

    readonly property var groups: [
        {
            title: "Reprodução",
            entries: [
                { action: "Pausar ou reproduzir", keys: "Espaço" },
                { action: "Voltar 5 segundos", keys: "←  ·  J" },
                { action: "Avançar 5 segundos", keys: "→  ·  L" },
                { action: "Marcar início do loop A", keys: "I" },
                { action: "Marcar fim do loop B", keys: "O" },
                { action: "Remover loop A–B", keys: "P" },
                { action: "Aumentar velocidade", keys: "Shift + >" },
                { action: "Diminuir velocidade", keys: "Shift + <" }
            ]
        },
        {
            title: "Áudios e legendas",
            entries: [
                { action: "Alternar faixa de áudio", keys: "A" },
                { action: "Alternar faixa de legenda", keys: "S" },
                { action: "Adiantar legenda em 100 ms", keys: "]" },
                { action: "Atrasar legenda em 100 ms", keys: "[" },
                { action: "Selecionar faixas disponíveis", keys: "Controles do player" },
                { action: "Adicionar legenda local", keys: "Informações  ›  Áudios e legendas" },
                { action: "Ver detalhes de áudio e codec", keys: "Informações  ›  Áudios e legendas" }
            ]
        },
        {
            title: "Player e biblioteca",
            entries: [
                { action: "Entrar ou sair da tela cheia", keys: "F" },
                { action: "Sair da tela cheia", keys: "Esc" },
                { action: "Abrir vocabulário e momentos", keys: "B" },
                { action: "Alternar modo de visualização", keys: "Grade  ·  Lista  ·  Compacta" },
                { action: "Abrir uma pasta", keys: "Clique na pasta" },
                { action: "Mover um vídeo", keys: "Menu do vídeo  ›  Mover" }
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
        implicitHeight: 78
        color: "#08ffffff"
        radius: 16
        Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: "#0cffffff" }
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 20
            anchors.rightMargin: 12
            spacing: 12
            Rectangle {
                Layout.preferredWidth: 42
                Layout.preferredHeight: 42
                radius: 12
                color: "#1a8b5cf6"
                border.color: "#338b5cf6"
                Text { anchors.centerIn: parent; text: "⌨"; color: "#c4b5fd"; font.pixelSize: 22 }
            }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3
                Label { text: "Atalhos e controles"; color: "#f4f4f5"; font.pixelSize: 16; font.bold: true }
                Label { text: "Controles do player nativo e da biblioteca de vídeos"; color: "#9293a5"; font.pixelSize: 11 }
            }
            ToolButton {
                text: "×"
                Accessible.name: "Fechar atalhos"
                onClicked: helpDialog.close()
                contentItem: Text { text: parent.text; color: "#a7a9be"; font.pixelSize: 24; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
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
            rowSpacing: 22
            Repeater {
                model: helpDialog.groups
                delegate: ColumnLayout {
                    Layout.fillWidth: true
                    Layout.alignment: Qt.AlignTop
                    spacing: 10
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 9
                        Rectangle { Layout.preferredWidth: 3; Layout.preferredHeight: 16; radius: 2; color: "#8b5cf6" }
                        Label { Layout.fillWidth: true; text: modelData.title; color: "#c4b5fd"; font.pixelSize: 13; font.bold: true }
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
                                color: "#c4b5fd"
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
