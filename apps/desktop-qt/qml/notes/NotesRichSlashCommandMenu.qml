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
        { id: "text", title: qsTr("Text"), subtitle: qsTr("Start with normal text."), icon: "T",
            keywords: ["text", "paragraph", "p", "texto", "paragrafo"] },
        { id: "h1", title: qsTr("Heading 1"), subtitle: qsTr("Large section heading."), icon: "H1",
            keywords: ["h1", "heading 1", "title 1", "titulo 1"] },
        { id: "h2", title: qsTr("Heading 2"), subtitle: qsTr("Medium section heading."), icon: "H2",
            keywords: ["h2", "heading 2", "title 2", "titulo 2"] },
        { id: "h3", title: qsTr("Heading 3"), subtitle: qsTr("Small section heading."), icon: "H3",
            keywords: ["h3", "heading 3", "title 3", "titulo 3"] },
        { id: "todo", title: qsTr("Task list"), subtitle: qsTr("Track tasks with checkboxes."), icon: "□",
            keywords: ["todo", "task", "check", "tarefa", "checklist"] },
        { id: "bullet", title: qsTr("Bulleted list"), subtitle: qsTr("Create a simple list."), icon: "•",
            keywords: ["bullet", "list", "points", "marcador", "lista"] },
        { id: "callout", title: qsTr("Callout"), subtitle: qsTr("Make text stand out."), icon: "❝",
            keywords: ["callout", "quote", "notice", "destaque", "aviso"] },
        { id: "code", title: qsTr("Code"), subtitle: qsTr("Insert a code block."), icon: "</>",
            keywords: ["code", "javascript", "typescript", "codigo"] },
        { id: "page", title: qsTr("Link to page"), subtitle: qsTr("Reference an existing page."), icon: "↗",
            keywords: ["page", "page link", "reference", "link to page", "pagina", "vincular pagina"] },
        { id: "page-create", title: qsTr("Create linked page"), subtitle: qsTr("Create a child page and link it here."), icon: "+",
            keywords: ["page create", "create page", "new page", "subpage", "criar pagina", "nova pagina"] },
        { id: "divider", title: qsTr("Divider"), subtitle: qsTr("Separate content blocks."), icon: "—",
            keywords: ["divider", "line", "hr", "divisor", "linha"] },
        { id: "table", title: qsTr("Table"), subtitle: qsTr("Insert a structured table."), icon: "▦",
            keywords: ["table", "grid", "tabela"] },
        { id: "table-week", title: qsTr("Weekly Table"), subtitle: qsTr("7 columns (Monday to Sunday)."), icon: "📅",
            keywords: ["semana", "dias", "semanal", "week", "table-week", "tabela semana"] },
        { id: "table-day", title: qsTr("Daily Schedule Table"), subtitle: qsTr("Daily schedule and activity table."), icon: "🕒",
            keywords: ["dia", "horarios", "diaria", "day", "table-day", "tabela dia"] },
        { id: "table-habit", title: qsTr("Habit Matrix Table"), subtitle: qsTr("Weekly matrix for habit consistency."), icon: "⚡",
            keywords: ["habitos", "habit", "matriz", "table-habit", "tabela habitos"] },
        { id: "cols2", title: qsTr("2 Columns"), subtitle: qsTr("Divide content into 2 equal columns."), icon: "⫽",
            keywords: ["2colunas", "cols2", "colunas", "duas colunas", "2"] },
        { id: "cols3", title: qsTr("3 Columns"), subtitle: qsTr("Divide content into 3 columns."), icon: "⫿",
            keywords: ["3colunas", "cols3", "tres colunas", "3"] },
        { id: "toggle", title: qsTr("Collapsible Toggle"), subtitle: qsTr("Expandable and collapsible block."), icon: "▶",
            keywords: ["toggle", "oculta", "dropdown", "colapsavel"] },
        { id: "blockquoteToggle", title: qsTr("Callout Toggle"), subtitle: qsTr("Callout with expandable dropdown."), icon: "▼",
            keywords: ["toggle destaque", "callout toggle", "blockquote toggle"] },
        { id: "question", title: qsTr("Quiz Question"), subtitle: qsTr("Multiple choice question with prompt and options."), icon: "❓",
            keywords: ["questao", "quiz", "pergunta", "exercicio", "question"] },
        { id: "foco", title: qsTr("Focus Timer"), subtitle: qsTr("Embedded Pomodoro focus session widget."), icon: "⏱️",
            keywords: ["foco", "timer", "pomodoro", "focus"] },
        { id: "alarme", title: qsTr("Scheduled Alarm"), subtitle: qsTr("Embedded alarm clock widget."), icon: "⏰",
            keywords: ["alarme", "despertador", "alarm"] },
        { id: "evento", title: qsTr("Calendar Event"), subtitle: qsTr("Linked calendar appointment card."), icon: "📆",
            keywords: ["evento", "agenda", "calendario", "event"] },
        { id: "habito", title: qsTr("Daily Habit"), subtitle: qsTr("Daily habit tracker widget."), icon: "🔥",
            keywords: ["habito", "habit", "rotina", "meta", "tracker"] },
        { id: "documento", title: qsTr("Attached Document"), subtitle: qsTr("Embedded file reference card."), icon: "📁",
            keywords: ["documento", "arquivo", "upload", "file"] },
        { id: "agrupar", title: qsTr("Document Bundle"), subtitle: qsTr("Group bundled documents into a card."), icon: "📦",
            keywords: ["agrupar", "bundle", "grupo", "pacote"] },
        { id: "scrap", title: qsTr("Web Snapshot"), subtitle: qsTr("Offline captured web page snapshot."), icon: "🌐",
            keywords: ["scrap", "snapshot", "web", "capturar"] }
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
