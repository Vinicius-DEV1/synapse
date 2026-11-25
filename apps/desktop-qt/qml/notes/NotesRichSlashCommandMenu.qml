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
        { id: "text", title: qsTr("Texto"), subtitle: qsTr("Comece a escrever com texto normal."), icon: "", iconName: "type",
            keywords: ["texto", "paragrafo", "p"] },
        { id: "h1", title: qsTr("Título 1"), accessibleTitle: "Heading 1", subtitle: qsTr("Título de seção grande."), icon: "", iconName: "heading-1",
            keywords: ["h1", "titulo 1", "header 1"] },
        { id: "h2", title: qsTr("Título 2"), accessibleTitle: "Heading 2", subtitle: qsTr("Título de seção médio."), icon: "", iconName: "heading-2",
            keywords: ["h2", "titulo 2", "header 2"] },
        { id: "h3", title: qsTr("Título 3"), accessibleTitle: "Heading 3", subtitle: qsTr("Título de seção pequeno."), icon: "", iconName: "heading-3",
            keywords: ["h3", "titulo 3", "header 3"] },
        { id: "cols2", title: qsTr("2 Colunas"), subtitle: qsTr("Dividir o conteúdo em 2 colunas de texto."), icon: "", iconName: "columns-2",
            keywords: ["2colunas", "2coluna", "cols2", "2cols", "colunas", "coluna", "duas colunas", "2 colunas", "2"] },
        { id: "cols3", title: qsTr("3 Colunas"), subtitle: qsTr("Dividir o conteúdo em 3 colunas de texto."), icon: "", iconName: "columns-3",
            keywords: ["3colunas", "3coluna", "cols3", "3cols", "tres colunas", "3 colunas", "3"] },
        { id: "todo", title: qsTr("Lista de tarefas"), subtitle: qsTr("Acompanhe tarefas com checkboxes."), icon: "", iconName: "check-square",
            keywords: ["todo", "tarefa", "check"] },
        { id: "bullet", title: qsTr("Lista de marcadores"), subtitle: qsTr("Crie uma lista simples com bolinhas."), icon: "", iconName: "list",
            keywords: ["bullet", "lista", "pontos"] },
        { id: "callout", title: qsTr("Destaque"), subtitle: qsTr("Faça um texto se destacar."), icon: "", iconName: "info",
            keywords: ["callout", "destaque", "aviso"] },
        { id: "code", title: qsTr("Código"), subtitle: qsTr("Adicione um bloco de código de programação."), icon: "", iconName: "code",
            keywords: ["code", "codigo", "js", "ts"] },
        { id: "page-create", title: qsTr("Criar Página"), subtitle: qsTr("Criar uma nova página vinculada."), icon: "", iconName: "file-plus",
            keywords: ["criar pagina", "nova pagina", "subpagina", "criar", "page create", "new page", "nova"] },
        { id: "page", title: qsTr("Vincular Página"), subtitle: qsTr("Vincular uma página existente."), icon: "", iconName: "file-text",
            keywords: ["vincular pagina", "pagina", "page", "vinculo", "vincular", "link pagina"] },
        { id: "group", title: qsTr("Coleção"), subtitle: qsTr("Agrupe páginas em uma coleção expansível."), icon: "", iconName: "folder",
            keywords: ["colecao", "grupo", "pasta"] },
        { id: "toggle", title: qsTr("Lista Oculta"), subtitle: qsTr("Lista que pode ser recolhida."), icon: "", iconName: "list-tree",
            keywords: ["toggle", "oculta", "dropdown"] },
        { id: "blockquoteToggle", title: qsTr("Toggle Destaque"), subtitle: qsTr("Toggle com visual de destaque (Callout)."), icon: "", iconName: "info",
            keywords: ["toggle destaque", "callout toggle"] },
        { id: "table", title: qsTr("Tabela"), subtitle: qsTr("Adicione uma tabela estruturada."), icon: "", iconName: "table",
            keywords: ["tabela", "table"] },
        { id: "table-week", title: qsTr("Tabela: Semana"), subtitle: qsTr("Tabela 7 colunas (Dias da semana)."), icon: "", iconName: "table",
            keywords: ["semana", "dias"] },
        { id: "table-day", title: qsTr("Tabela: Dia"), subtitle: qsTr("Tabela de horários diários."), icon: "", iconName: "table",
            keywords: ["dia", "horarios"] },
        { id: "table-habit", title: qsTr("Tabela: Hábitos"), subtitle: qsTr("Matriz para rastreio de hábitos."), icon: "", iconName: "table",
            keywords: ["habitos", "habit"] },
        { id: "question", title: qsTr("Questão"), subtitle: qsTr("Crie uma questão de múltipla escolha com IA."), icon: "", iconName: "help",
            keywords: ["questao", "quiz", "pergunta"] },
        { id: "ia", title: qsTr("Pedir à IA"), subtitle: qsTr("Peça para a IA escrever qualquer coisa."), icon: "", iconName: "sparkles",
            keywords: ["ia", "ai", "prompt"] },
        { id: "divider", title: qsTr("Divisor"), subtitle: qsTr("Separe blocos visualmente."), icon: "", iconName: "minus",
            keywords: ["divisor", "linha", "hr"] },
        { id: "foco", title: qsTr("Foco (Timer)"), subtitle: qsTr("Ex: /foco 25 #Tag Descrição"), icon: "", iconName: "clock",
            keywords: ["foco", "timer", "pomodoro"] },
        { id: "alarme", title: qsTr("Alarme"), subtitle: qsTr("Ex: /alarme 15:30"), icon: "", iconName: "clock",
            keywords: ["alarme", "despertador"] },
        { id: "documento", title: qsTr("Documento(s)"), subtitle: qsTr("Enviar arquivo(s) avulsos ou agrupados para esta página."), icon: "", iconName: "archive",
            keywords: ["documento", "documentos", "arquivo", "arquivos", "upload", "grupo", "pacote", "bundle"] },
        { id: "agrupar", title: qsTr("Agrupar Documentos"), subtitle: qsTr("Criar um widget que agrupa arquivos soltos da página."), icon: "", iconName: "layers",
            keywords: ["agrupar", "bundle", "grupo", "agrupamento", "juntar", "pacote"] },
        { id: "scrap", title: qsTr("Snapshot Web (Scrap)"), subtitle: qsTr("Capturar página 100% offline (HTML, CSS e imagens). Ex: /scrap https://site.com"), icon: "", iconName: "archive",
            keywords: ["scrap", "snapshot", "web", "capturar", "pagina", "offline", "copia"] },
        { id: "video", title: qsTr("Vincular Vídeo"), subtitle: qsTr("Vincular um vídeo da sua galeria."), icon: "", iconName: "film",
            keywords: ["video", "midia"] },
        { id: "livro", title: qsTr("Vincular Livro"), subtitle: qsTr("Vincular um livro da sua biblioteca."), icon: "", iconName: "book-open",
            keywords: ["livro", "epub", "pdf"] },
        { id: "evento", title: qsTr("Evento da Agenda"), subtitle: qsTr("Criar e vincular um evento na agenda com avisos."), icon: "", iconName: "calendar",
            keywords: ["evento", "agenda", "calendario"] },
        { id: "habito", title: qsTr("Hábito / Meta Diária"), subtitle: qsTr("Rastrear hábito com mapa de consistência (Heatmap)."), icon: "", iconName: "flame",
            keywords: ["habito", "habit", "tracker", "rotina", "frequencia", "meta"] },
        { id: "mermaid", title: qsTr("Diagrama Mermaid"), subtitle: qsTr("Fluxograma ou diagrama de arquitetura."), icon: "", iconName: "diagrams",
            keywords: ["mermaid", "diagrama", "fluxograma", "flowchart", "diagram"] }
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
                    normalizedQuery.indexOf(normalizedKeyword) >= 0
            })
        })
    }
    signal commandSelected(string commandId)
    readonly property int headerHeight: filteredCommands.length === 0 ? 0 : 33
    readonly property int footerHeight: errorMessage.length > 0 ? 36 : 0
    readonly property int listHeight: filteredCommands.length === 0
        ? 44 : Math.min(Math.max(0, 320 - headerHeight - footerHeight - 2), filteredCommands.length * 56 + 8)
    readonly property int menuHeight: headerHeight + listHeight + footerHeight + 2

    visible: open
    opacity: open ? 1 : 0
    z: 20
    Accessible.role: Accessible.List
    Accessible.name: qsTr("Blocos Básicos")
    Accessible.description: filteredCommands.length === 0
        ? qsTr("Nenhum bloco encontrado.")
        : qsTr("%1 blocos encontrados. Use as setas do editor para selecionar.").arg(filteredCommands.length)
    Accessible.ignored: !visible
    width: parent ? Math.max(0, Math.min(288, parent.width - 16)) : 288
    height: menuHeight
    x: parent ? Math.max(8, Math.min(anchorX, parent.width - width - 8)) : anchorX
    y: {
        if (!parent) return anchorY
        return anchorY + 320 <= parent.height
            ? anchorY
            : anchorY - 24 - height
    }
    transform: Translate {
        y: slashMenu.open ? 0 : 4
        Behavior on y {
            enabled: slashMenu.open
            NumberAnimation { duration: 200; easing.type: Easing.OutCubic }
        }
    }
    Behavior on opacity {
        NumberAnimation { duration: 200; easing.type: Easing.OutCubic }
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
        radius: 8
        color: "#0f0e17"
        border.color: "#0fffffff"
        clip: true
    }

    Column {
        anchors.fill: parent
        spacing: 0
        Rectangle {
            width: parent.width
            height: slashMenu.headerHeight
            visible: slashMenu.filteredCommands.length > 0
            color: "#14131f"
            Text {
                anchors.fill: parent
                anchors.leftMargin: 12
                verticalAlignment: Text.AlignVCenter
                color: "#a7a9be"
                font.pixelSize: 12
                font.weight: Font.DemiBold
                font.letterSpacing: 0.6
                text: qsTr("Blocos Básicos").toUpperCase()
            }
            Rectangle {
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.bottom: parent.bottom
                height: 1
                color: "#0fffffff"
            }
        }

        ListView {
            id: commandList
            objectName: "notesRichSlashCommandList"
            x: 4
            width: Math.max(0, parent.width - 8)
            height: slashMenu.listHeight
            clip: true
            topMargin: 4
            bottomMargin: 4
            model: slashMenu.filteredCommands
            currentIndex: slashMenu.selectedIndex
            boundsBehavior: Flickable.StopAtBounds
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
                    color: slashMenu.selectedIndex === commandButton.index
                        ? "#1affffff" : commandButton.hovered ? "#0dffffff" : "transparent"
                }
                contentItem: Row {
                    spacing: 12
                    x: 12
                    width: Math.max(0, parent.width - 24)
                    height: parent.height
                    Rectangle {
                        width: 40
                        height: 40
                        radius: 4
                        color: "#0dffffff"
                        border.color: "#14ffffff"
                        anchors.verticalCenter: parent.verticalCenter

                        NotesSlashCommandIcon {
                            visible: Boolean(commandButton.modelData.iconName)
                            anchors.centerIn: parent
                            name: commandButton.modelData.iconName || "notes"
                            color: "#e2e8f0"
                            width: 18
                            height: 18
                        }

                        Text {
                            visible: !commandButton.modelData.iconName
                            anchors.fill: parent
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                            color: "#fffffe"
                            font.pixelSize: 12
                            font.weight: Font.Bold
                            text: commandButton.modelData.icon || ""
                        }
                    }
                    Column {
                        anchors.verticalCenter: parent.verticalCenter
                        width: Math.max(0, commandButton.width - 76)
                        spacing: 2
                        Text {
                            width: parent.width
                            color: "#fffffe"
                            font.pixelSize: 14
                            font.weight: Font.Medium
                            elide: Text.ElideRight
                            text: commandButton.modelData.title
                        }
                        Text {
                            width: parent.width
                            color: "#a7a9be"
                            font.pixelSize: 12
                            wrapMode: Text.WordWrap
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
                font.pixelSize: 14
                text: qsTr("Nenhum bloco encontrado")
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
