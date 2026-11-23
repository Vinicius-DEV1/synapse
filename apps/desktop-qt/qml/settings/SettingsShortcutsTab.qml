import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: shortcutsTabRoot
    Layout.fillWidth: true
    implicitHeight: contentCol.implicitHeight

    Theme { id: theme }

    property string searchQuery: ""

    readonly property var shortcutGroups: [
        {
            title: qsTr("Navegação e Sistema"),
            icon: "layout",
            color: theme.brand400,
            items: [
                { keys: ["Ctrl", "Tab"], desc: qsTr("Avançar para a próxima aba aberta") },
                { keys: ["Ctrl", "Shift", "Tab"], desc: qsTr("Voltar para a aba anterior") },
                { keys: ["Ctrl", "B"], desc: qsTr("Recolher ou expandir a barra lateral") },
                { keys: ["Ctrl", "\\"], desc: qsTr("Alternar visibilidade da barra lateral") },
                { keys: ["Ctrl", "K"], desc: qsTr("Abrir a Paleta de Comandos e busca rápida") },
                { keys: ["Ctrl", "P"], desc: qsTr("Busca global e alternador de páginas") },
                { keys: ["Ctrl", ","], desc: qsTr("Abrir Configurações do Aplicativo") },
                { keys: ["Ctrl", "H"], desc: qsTr("Ir para a página de Início") },
                { keys: ["Ctrl", "1..9"], desc: qsTr("Navegar diretamente entre módulos") },
                { keys: ["F11"], desc: qsTr("Alternar modo de Tela Cheia") },
                { keys: ["Esc"], desc: qsTr("Fechar modais, diálogos e menus flutuantes") }
            ]
        },
        {
            title: qsTr("Editor de Notas e Caderno"),
            icon: "notes",
            color: "#10b981",
            items: [
                { keys: ["Ctrl", "S"], desc: qsTr("Salvar imediatamente o documento atual") },
                { keys: ["Ctrl", "B"], desc: qsTr("Aplicar ou remover formato Negrito") },
                { keys: ["Ctrl", "I"], desc: qsTr("Aplicar ou remover formato Itálico") },
                { keys: ["Ctrl", "U"], desc: qsTr("Aplicar ou remover formato Sublinhado") },
                { keys: ["Ctrl", "Z"], desc: qsTr("Desfazer última alteração de texto") },
                { keys: ["Ctrl", "Shift", "Z"], desc: qsTr("Refazer alteração de texto desfeita") },
                { keys: ["Ctrl", "Alt", "1..3"], desc: qsTr("Transformar bloco em Título H1, H2 ou H3") },
                { keys: ["/"], desc: qsTr("Abrir menu de Slash Commands no início da linha") }
            ]
        },
        {
            title: qsTr("Leitor de Livros e PDFs"),
            icon: "library",
            color: "#a855f7",
            items: [
                { keys: ["F"], desc: qsTr("Alternar modo de Foco no Leitor") },
                { keys: ["M"], desc: qsTr("Alternar tema do leitor (Escuro, Claro, Sépia)") },
                { keys: ["+", "="], desc: qsTr("Aumentar zoom da página atual") },
                { keys: ["-"], desc: qsTr("Diminuir zoom da página atual") },
                { keys: ["Seta Esquerda"], desc: qsTr("Ir para a página anterior do documento") },
                { keys: ["Seta Direita", "Espaço"], desc: qsTr("Avançar para a próxima página") }
            ]
        },
        {
            title: qsTr("Reprodutor de Vídeos"),
            icon: "video",
            color: "#3b82f6",
            items: [
                { keys: ["Espaço"], desc: qsTr("Alternar Reproduzir / Pausar vídeo") },
                { keys: ["F"], desc: qsTr("Alternar vídeo em modo Tela Cheia") },
                { keys: ["M"], desc: qsTr("Ativar ou desativar Mudo") },
                { keys: ["Seta Esquerda"], desc: qsTr("Retroceder 5 segundos de reprodução") },
                { keys: ["Seta Direita"], desc: qsTr("Avançar 5 segundos de reprodução") },
                { keys: ["Seta Cima / Baixo"], desc: qsTr("Aumentar ou diminuir volume") }
            ]
        },
        {
            title: qsTr("Flashcards e Anki"),
            icon: "anki",
            color: "#f59e0b",
            items: [
                { keys: ["Espaço"], desc: qsTr("Virar cartão e revelar resposta") },
                { keys: ["1"], desc: qsTr("Classificar como Repetir (Again)") },
                { keys: ["2"], desc: qsTr("Classificar como Difícil (Hard)") },
                { keys: ["3"], desc: qsTr("Classificar como Bom (Good)") },
                { keys: ["4"], desc: qsTr("Classificar como Fácil (Easy)") },
                { keys: ["E"], desc: qsTr("Abrir editor do cartão atual") }
            ]
        }
    ]

    function matchesSearch(text) {
        if (!searchQuery || searchQuery.trim() === "") return true
        return text.toLowerCase().indexOf(searchQuery.toLowerCase().trim()) !== -1
    }

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        spacing: 20

        // Search Bar & Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            RowLayout {
                spacing: 8
                AppIcon { width: 18; height: 18; name: "keyboard"; color: theme.brand400 }
                Text {
                    text: qsTr("Atalhos de Teclado")
                    color: theme.textDark
                    font.pixelSize: 15
                    font.bold: true
                }
            }

            Item { Layout.fillWidth: true }

            // Filter Search Box
            Rectangle {
                Layout.preferredWidth: 260
                Layout.preferredHeight: 34
                radius: 8
                color: theme.bgDarkSurface
                border.color: searchInput.activeFocus ? theme.brand500 : theme.borderSubtle

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 8
                    spacing: 8

                    AppIcon { width: 14; height: 14; name: "search"; color: theme.textSubtext }

                    TextInput {
                        id: searchInput
                        Layout.fillWidth: true
                        color: theme.textDark
                        font.pixelSize: 12
                        selectByMouse: true
                        clip: true
                        onTextChanged: shortcutsTabRoot.searchQuery = text

                        Text {
                            anchors.fill: parent
                            text: qsTr("Filtrar atalhos...")
                            color: theme.textMuted
                            font.pixelSize: 12
                            visible: !searchInput.text && !searchInput.activeFocus
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }
            }
        }

        // Groups Repeater
        Repeater {
            model: shortcutsTabRoot.shortcutGroups

            delegate: Rectangle {
                id: groupCard
                Layout.fillWidth: true
                radius: 12
                color: theme.bgDarkCard
                border.color: theme.borderCard
                Layout.preferredHeight: groupCol.implicitHeight + 24
                visible: filteredItemsCount > 0

                property int filteredItemsCount: {
                    var count = 0
                    for (var i = 0; i < modelData.items.length; i++) {
                        if (shortcutsTabRoot.matchesSearch(modelData.items[i].desc) ||
                            shortcutsTabRoot.matchesSearch(modelData.items[i].keys.join(" "))) {
                            count++
                        }
                    }
                    return count
                }

                ColumnLayout {
                    id: groupCol
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 10

                    // Group Header
                    RowLayout {
                        spacing: 8
                        AppIcon { width: 16; height: 16; name: modelData.icon; color: modelData.color }
                        Text {
                            text: modelData.title
                            color: theme.textDark
                            font.pixelSize: 13
                            font.bold: true
                        }
                        Text {
                            text: "(" + groupCard.filteredItemsCount + ")"
                            color: theme.textMuted
                            font.pixelSize: 11
                        }
                    }

                    Rectangle { Layout.fillWidth: true; height: 1; color: theme.borderSubtle }

                    // Items
                    Repeater {
                        model: modelData.items

                        delegate: Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 34
                            radius: 6
                            color: itemMouse.containsMouse ? theme.bgHover : "transparent"
                            visible: shortcutsTabRoot.matchesSearch(modelData.desc) || shortcutsTabRoot.matchesSearch(modelData.keys.join(" "))

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 8
                                anchors.rightMargin: 8
                                spacing: 12

                                Text {
                                    Layout.fillWidth: true
                                    text: modelData.desc
                                    color: theme.textSubtext
                                    font.pixelSize: 12
                                    elide: Text.ElideRight
                                }

                                RowLayout {
                                    spacing: 4

                                    Repeater {
                                        model: modelData.keys

                                        delegate: Rectangle {
                                            radius: 5
                                            color: theme.bgDarkSurface
                                            border.color: theme.borderSubtle
                                            implicitWidth: keyText.implicitWidth + 14
                                            implicitHeight: 22

                                            Text {
                                                id: keyText
                                                anchors.centerIn: parent
                                                text: modelData
                                                color: theme.textDark
                                                font.pixelSize: 10
                                                font.family: theme.fontMono
                                                font.bold: true
                                            }
                                        }
                                    }
                                }
                            }

                            MouseArea {
                                id: itemMouse
                                anchors.fill: parent
                                hoverEnabled: true
                            }
                        }
                    }
                }
            }
        }
    }
}
