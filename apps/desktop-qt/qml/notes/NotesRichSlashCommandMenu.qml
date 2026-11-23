pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: slashMenu
    objectName: "notesRichSlashCommandMenu"
    property bool open: false
    property string query: ""
    property real anchorX: 0
    property real anchorY: 0
    property int selectedIndex: 0
    property string errorMessage: ""
    readonly property var commands: [
        { id: "text", category: qsTr("Blocos Básicos"), title: qsTr("Texto"), subtitle: qsTr("Comece a escrever com texto normal."), icon: "T",
            keywords: ["text", "paragraph", "p", "texto", "paragrafo"] },
        { id: "h1", category: qsTr("Blocos Básicos"), title: qsTr("Título 1"), accessibleTitle: "Heading 1", subtitle: qsTr("Título de seção grande."), icon: "H1",
            keywords: ["h1", "heading 1", "title 1", "titulo 1"] },
        { id: "h2", category: qsTr("Blocos Básicos"), title: qsTr("Título 2"), accessibleTitle: "Heading 2", subtitle: qsTr("Título de seção médio."), icon: "H2",
            keywords: ["h2", "heading 2", "title 2", "titulo 2"] },
        { id: "h3", category: qsTr("Blocos Básicos"), title: qsTr("Título 3"), accessibleTitle: "Heading 3", subtitle: qsTr("Título de seção pequeno."), icon: "H3",
            keywords: ["h3", "heading 3", "title 3", "titulo 3"] },
        { id: "todo", category: qsTr("Blocos Básicos"), title: qsTr("Lista de tarefas"), subtitle: qsTr("Acompanhe tarefas com checkboxes."), icon: "☑",
            keywords: ["todo", "task", "check", "tarefa", "checklist"] },
        { id: "bullet", category: qsTr("Blocos Básicos"), title: qsTr("Lista de marcadores"), subtitle: qsTr("Crie uma lista simples com bolinhas."), icon: "•",
            keywords: ["bullet", "list", "points", "marcador", "lista"] },
        { id: "callout", category: qsTr("Blocos Básicos"), title: qsTr("Destaque"), subtitle: qsTr("Faça um texto se destacar."), icon: "❝",
            keywords: ["callout", "quote", "notice", "destaque", "aviso"] },
        { id: "code", category: qsTr("Blocos Básicos"), title: qsTr("Código"), subtitle: qsTr("Adicione um bloco de código de programação."), icon: "</>",
            keywords: ["code", "javascript", "typescript", "codigo"] },
        { id: "page", category: qsTr("Blocos Básicos"), title: qsTr("Vincular Página"), subtitle: qsTr("Vincular uma página existente."), icon: "↗",
            keywords: ["page", "page link", "reference", "link to page", "pagina", "vincular pagina"] },
        { id: "page-create", category: qsTr("Blocos Básicos"), title: qsTr("Criar Página"), subtitle: qsTr("Criar uma nova página vinculada."), icon: "+",
            keywords: ["page create", "create page", "new page", "subpage", "criar pagina", "nova pagina"] },
        { id: "divider", category: qsTr("Blocos Básicos"), title: qsTr("Divisor"), subtitle: qsTr("Separe blocos visualmente."), icon: "—",
            keywords: ["divider", "line", "hr", "divisor", "linha"] },
        { id: "table", category: qsTr("Estrutura & Tabelas"), title: qsTr("Tabela"), subtitle: qsTr("Adicione uma tabela estruturada."), icon: "▦",
            keywords: ["table", "grid", "tabela"] },
        { id: "table-week", category: qsTr("Estrutura & Tabelas"), title: qsTr("Tabela: Semana"), subtitle: qsTr("Tabela 7 colunas (Dias da semana)."), icon: "📅",
            keywords: ["semana", "dias", "semanal", "week", "table-week", "tabela semana"] },
        { id: "table-day", category: qsTr("Estrutura & Tabelas"), title: qsTr("Tabela: Dia"), subtitle: qsTr("Tabela de horários diários."), icon: "🕒",
            keywords: ["dia", "horarios", "diaria", "day", "table-day", "tabela dia"] },
        { id: "table-habit", category: qsTr("Estrutura & Tabelas"), title: qsTr("Tabela: Hábitos"), subtitle: qsTr("Matriz para rastreio de hábitos."), icon: "⚡",
            keywords: ["habitos", "habit", "matriz", "table-habit", "tabela habitos"] },
        { id: "cols2", category: qsTr("Estrutura & Tabelas"), title: qsTr("2 Colunas"), subtitle: qsTr("Dividir o conteúdo em 2 colunas."), icon: "⫽",
            keywords: ["2colunas", "cols2", "colunas", "duas colunas", "2"] },
        { id: "cols3", category: qsTr("Estrutura & Tabelas"), title: qsTr("3 Colunas"), subtitle: qsTr("Dividir o conteúdo em 3 colunas."), icon: "⫿",
            keywords: ["3colunas", "cols3", "tres colunas", "3"] },
        { id: "toggle", category: qsTr("Estrutura & Tabelas"), title: qsTr("Lista Oculta"), subtitle: qsTr("Lista que pode ser recolhida."), icon: "▶",
            keywords: ["toggle", "oculta", "dropdown", "colapsavel"] },
        { id: "blockquoteToggle", category: qsTr("Estrutura & Tabelas"), title: qsTr("Toggle Destaque"), subtitle: qsTr("Toggle com visual de destaque."), icon: "▼",
            keywords: ["toggle destaque", "callout toggle", "blockquote toggle"] },
        { id: "question", category: qsTr("Widgets & Mídia"), title: qsTr("Questão"), subtitle: qsTr("Bloco de exercícios de múltipla escolha."), icon: "❓",
            keywords: ["questao", "quiz", "pergunta", "exercicio", "question"] },
        { id: "foco", category: qsTr("Widgets & Mídia"), title: qsTr("Foco (Timer)"), subtitle: qsTr("Timer Pomodoro embutido na página."), icon: "⏱",
            keywords: ["foco", "timer", "pomodoro", "focus"] },
        { id: "alarme", category: qsTr("Widgets & Mídia"), title: qsTr("Alarme"), subtitle: qsTr("Lembrete/alarme agendado inline."), icon: "⏰",
            keywords: ["alarme", "despertador", "alarm"] },
        { id: "evento", category: qsTr("Widgets & Mídia"), title: qsTr("Evento da Agenda"), subtitle: qsTr("Compromisso vinculado ao calendário."), icon: "📆",
            keywords: ["evento", "agenda", "calendario", "event"] },
        { id: "habito", category: qsTr("Widgets & Mídia"), title: qsTr("Hábito / Meta Diária"), subtitle: qsTr("Rastrear hábito e consistência diária."), icon: "🔥",
            keywords: ["habito", "habit", "rotina", "meta", "tracker"] },
        { id: "documento", category: qsTr("Widgets & Mídia"), title: qsTr("Documento(s)"), subtitle: qsTr("Anexar arquivo criptografado na página."), icon: "📁",
            keywords: ["documento", "arquivo", "upload", "file"] },
        { id: "agrupar", category: qsTr("Widgets & Mídia"), title: qsTr("Agrupar Documentos"), subtitle: qsTr("Agrupar arquivos/páginas em pacote."), icon: "📦",
            keywords: ["agrupar", "bundle", "grupo", "pacote"] },
        { id: "scrap", category: qsTr("Widgets & Mídia"), title: qsTr("Snapshot Web (Scrap)"), subtitle: qsTr("Captura offline de página da web."), icon: "🌐",
            keywords: ["scrap", "snapshot", "web", "capturar"] },
        { id: "group", category: qsTr("Widgets & Mídia"), title: qsTr("Coleção"), subtitle: qsTr("Grupo expansível de páginas/blocos."), icon: "🗂",
            keywords: ["colecao", "grupo", "pasta", "collection", "group"] },
        { id: "video", category: qsTr("Widgets & Mídia"), title: qsTr("Vincular Vídeo"), subtitle: qsTr("Vincular um vídeo da sua galeria."), icon: "🎬",
            keywords: ["video", "midia", "filme", "media"] },
        { id: "livro", category: qsTr("Widgets & Mídia"), title: qsTr("Vincular Livro"), subtitle: qsTr("Vincular um livro da sua biblioteca."), icon: "📖",
            keywords: ["livro", "epub", "pdf", "book", "library"] },
        { id: "ia", category: qsTr("Widgets & Mídia"), title: qsTr("Pedir à IA"), subtitle: qsTr("Solicitar ajuda ou geração à IA."), icon: "✨",
            keywords: ["ia", "ai", "prompt", "assistente", "gerar"] }
    ]
    readonly property var filteredCommands: {
        var normalizedQuery = query.toLowerCase().trim()
        if (normalizedQuery.length === 0) return commands
        return commands.filter(function(command) {
            if (command.id.toLowerCase().indexOf(normalizedQuery) >= 0 ||
                    command.title.toLowerCase().indexOf(normalizedQuery) >= 0 ||
                    command.subtitle.toLowerCase().indexOf(normalizedQuery) >= 0) return true
            return command.keywords.some(function(keyword) {
                var normalizedKeyword = keyword.toLowerCase()
                return normalizedKeyword.indexOf(normalizedQuery) >= 0 ||
                    (normalizedKeyword.length > 2 && normalizedQuery.indexOf(normalizedKeyword) >= 0)
            })
        })
    }
    signal commandSelected(string commandId)
    readonly property int headerHeight: 34
    readonly property int footerHeight: errorMessage.length > 0 ? 36 : 0
    readonly property int menuHeight: headerHeight + (filteredCommands.length === 0
        ? 48 : Math.min(280, filteredCommands.length * 56)) + footerHeight

    visible: open
    z: 20
    Accessible.role: Accessible.List
    Accessible.name: qsTr("Basic blocks")
    Accessible.description: filteredCommands.length === 0
        ? qsTr("No matching blocks.")
        : qsTr("%1 matching blocks. Use the editor arrow keys to select one.").arg(filteredCommands.length)
    Accessible.ignored: !visible
    width: parent ? Math.max(0, Math.min(288, parent.width - 16)) : 288
    height: menuHeight
    x: parent ? Math.max(8, Math.min(anchorX, parent.width - width - 8)) : anchorX
    y: {
        if (!parent) return anchorY
        return anchorY + height + 8 <= parent.height - 8
            ? Math.max(8, anchorY)
            : Math.max(8, anchorY - height - 8)
    }

    function moveSelection(delta) {
        if (filteredCommands.length === 0) return
        selectedIndex = (selectedIndex + delta + filteredCommands.length) % filteredCommands.length
    }

    onQueryChanged: {
        selectedIndex = 0
        errorMessage = ""
    }

    Rectangle {
        anchors.fill: parent
        radius: 9
        color: "#0f0e17"
        border.color: "#14ffffff"
        clip: true
    }

    Column {
        anchors.fill: parent
        spacing: 0
        Rectangle {
            width: parent.width
            height: slashMenu.headerHeight
            color: "#0a171621"
            Text {
                anchors.fill: parent
                anchors.leftMargin: 12
                verticalAlignment: Text.AlignVCenter
                color: "#a7a9be"
                font.pixelSize: 10
                font.weight: Font.DemiBold
                text: qsTr("Basic blocks").toUpperCase()
            }
        }

        ListView {
            id: commandList
            objectName: "notesRichSlashCommandList"
            width: parent.width
            height: Math.max(0, slashMenu.height - slashMenu.headerHeight - slashMenu.footerHeight)
            clip: true
            model: slashMenu.filteredCommands
            currentIndex: slashMenu.selectedIndex
            boundsBehavior: Flickable.StopAtBounds
            section.property: "category"
            section.criteria: ViewSection.FullString
            section.delegate: Rectangle {
                required property string section
                width: commandList.width
                height: 22
                color: "#151422"
                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    anchors.left: parent.left
                    anchors.leftMargin: 12
                    text: parent.section.toUpperCase()
                    color: "#7f5af0"
                    font.pixelSize: 9
                    font.bold: true
                    font.letterSpacing: 0.7
                }
            }
            delegate: Button {
                id: commandButton
                objectName: "notesRichSlashCommand_" + modelData.id
                required property var modelData
                required property int index
                width: commandList.width
                height: 56
                padding: 0
                focusPolicy: Qt.NoFocus
                Accessible.name: modelData.title + ". " + modelData.subtitle
                background: Rectangle {
                    radius: 6
                    color: commandButton.hovered || slashMenu.selectedIndex === commandButton.index
                        ? "#1affffff" : "transparent"
                }
                contentItem: Row {
                    spacing: 10
                    x: 8
                    width: Math.max(0, parent.width - 16)
                    height: parent.height
                    Rectangle {
                        width: 40
                        height: 40
                        radius: 6
                        color: "#0affffff"
                        border.color: "#14ffffff"
                        anchors.verticalCenter: parent.verticalCenter
                        Text {
                            anchors.fill: parent
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: commandButton.modelData.icon.length > 2 ? 12 : 14
                            font.weight: Font.Medium
                            text: commandButton.modelData.icon
                        }
                    }
                    Column {
                        anchors.verticalCenter: parent.verticalCenter
                        width: Math.max(0, commandButton.width - 68)
                        spacing: 2
                        Text {
                            width: parent.width
                            color: "#fffffe"
                            font.pixelSize: 13
                            font.weight: Font.Medium
                            elide: Text.ElideRight
                            text: commandButton.modelData.title
                        }
                        Text {
                            width: parent.width
                            color: "#a7a9be"
                            font.pixelSize: 11
                            elide: Text.ElideRight
                            text: commandButton.modelData.subtitle
                        }
                    }
                }
                onHoveredChanged: if (hovered) slashMenu.selectedIndex = index
                onClicked: slashMenu.commandSelected(modelData.id)
            }

            Text {
                anchors.centerIn: parent
                visible: slashMenu.filteredCommands.length === 0
                color: "#a7a9be"
                font.pixelSize: 12
                text: qsTr("No blocks found")
            }
        }

        Text {
            visible: slashMenu.errorMessage.length > 0
            width: Math.max(0, parent.width - 24)
            height: visible ? slashMenu.footerHeight : 0
            anchors.horizontalCenter: parent.horizontalCenter
            verticalAlignment: Text.AlignVCenter
            wrapMode: Text.Wrap
            color: "#fda4af"
            font.pixelSize: 11
            text: slashMenu.errorMessage
        }
    }
}
