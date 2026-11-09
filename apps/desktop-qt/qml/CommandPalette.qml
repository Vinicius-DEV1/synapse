import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: paletteRoot
    visible: isOpen
    anchors.fill: parent
    color: "#00000088"
    z: 1000

    property bool isOpen: false
    property string searchQuery: ""
    property int selectedIndex: 0

    signal navigateToTab(string tabKey)
    signal triggerAction(string actionKey)

    function open() {
        isOpen = true
        searchQuery = ""
        paletteInput.text = ""
        selectedIndex = 0
        updateResults()
        paletteInput.forceActiveFocus()
    }

    function close() {
        isOpen = false
    }

    property var allActions: [
        { label: "Ir para Início & Dashboard", icon: "🏠", category: "Navegação", tab: "home" },
        { label: "Ir para Caderno & Notas", icon: "📝", category: "Navegação", tab: "notes" },
        { label: "Ir para Flashcards & Baralhos Anki", icon: "🎴", category: "Navegação", tab: "anki" },
        { label: "Ir para Banco de Questões (ZenQuiz)", icon: "🎯", category: "Navegação", tab: "quiz" },
        { label: "Ir para Vídeos & Media Center", icon: "🎬", category: "Navegação", tab: "video" },
        { label: "Ir para Finanças & Orçamento", icon: "💰", category: "Navegação", tab: "finance" },
        { label: "Ir para Hábitos & Rotina", icon: "⚡", category: "Navegação", tab: "habits" },
        { label: "Ir para Agenda & Calendário", icon: "📅", category: "Navegação", tab: "calendar" },
        { label: "Ir para Biblioteca & Livros", icon: "📚", category: "Navegação", tab: "library" },
        { label: "Ir para Cultura & Mídia", icon: "🎭", category: "Navegação", tab: "culture" },
        { label: "Ir para Foco & Lo-Fi Pomodoro", icon: "⏳", category: "Navegação", tab: "focus" },
        { label: "Ir para Cofre E2EE & Credenciais", icon: "🔒", category: "Navegação", tab: "vault" },
        { label: "Ir para Lixeira do Sistema", icon: "🗑️", category: "Navegação", tab: "trash" },
        { label: "Ir para Configurações & Diagnóstico", icon: "⚙️", category: "Navegação", tab: "settings" },
        { label: "Criar Nova Nota de Estudo", icon: "➕", category: "Ações Rápidas", action: "new_note" },
        { label: "Adicionar Novo Evento na Agenda", icon: "➕", category: "Ações Rápidas", action: "new_event" },
        { label: "Criar Novo Hábito Diário", icon: "➕", category: "Ações Rápidas", action: "new_habit" },
        { label: "Registrar Nova Transação Financeira", icon: "➕", category: "Ações Rápidas", action: "new_transaction" },
        { label: "Cadastrar Nova Credencial no Cofre", icon: "➕", category: "Ações Rápidas", action: "new_vault" }
    ]

    property var filteredResults: []

    function updateResults() {
        var q = searchQuery.trim().toLowerCase()
        if (q.length === 0) {
            filteredResults = allActions
            return
        }
        var matches = []
        for (var i = 0; i < allActions.length; i++) {
            var item = allActions[i]
            if (item.label.toLowerCase().indexOf(q) !== -1 || item.category.toLowerCase().indexOf(q) !== -1) {
                matches.push(item)
            }
        }

        // Also search notes titles dynamically
        var pages = dataController.getPages(q)
        for (var p = 0; p < Math.min(pages.length, 5); p++) {
            var page = pages[p]
            matches.push({
                label: "Nota: " + (page.title || "Sem título"),
                icon: page.icon || "📄",
                category: "Notas",
                tab: "notes",
                pageId: page.id
            })
        }

        filteredResults = matches
        if (selectedIndex >= filteredResults.length) {
            selectedIndex = 0
        }
    }

    function executeSelected() {
        if (filteredResults.length === 0) return
        var item = filteredResults[selectedIndex]
        if (!item) return

        if (item.tab) {
            navigateToTab(item.tab)
        } else if (item.action) {
            triggerAction(item.action)
        }
        close()
    }

    // Dismiss on background click
    MouseArea {
        anchors.fill: parent
        onClicked: paletteRoot.close()
    }

    // Center Dialog
    Rectangle {
        id: paletteDialog
        width: 620
        height: Math.min(500, 72 + filteredResults.length * 48 + 32)
        radius: 16
        color: "#161524"
        border.color: "#818cf840"
        border.width: 1
        anchors.horizontalCenter: parent.horizontalCenter
        y: parent.height * 0.15

        // Prevent click through
        MouseArea {
            anchors.fill: parent
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 12

            // Search Bar Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text {
                    text: "🔍"
                    font.pixelSize: 16
                }

                TextInput {
                    id: paletteInput
                    Layout.fillWidth: true
                    color: "#ffffff"
                    font.pixelSize: 15
                    font.bold: true
                    selectByMouse: true
                    onTextChanged: {
                        paletteRoot.searchQuery = text
                        paletteRoot.updateResults()
                    }
                    Keys.onEscapePressed: paletteRoot.close()
                    Keys.onDownPressed: {
                        if (paletteRoot.selectedIndex < paletteRoot.filteredResults.length - 1) {
                            paletteRoot.selectedIndex++
                        }
                    }
                    Keys.onUpPressed: {
                        if (paletteRoot.selectedIndex > 0) {
                            paletteRoot.selectedIndex--
                        }
                    }
                    Keys.onReturnPressed: paletteRoot.executeSelected()
                    Keys.onEnterPressed: paletteRoot.executeSelected()

                    Text {
                        text: "Buscar módulo, comando ou nota... (↑↓ para navegar, Enter para abrir)"
                        color: "#64748b"
                        font.pixelSize: 13
                        font.bold: false
                        visible: !paletteInput.text && !paletteInput.activeFocus
                        anchors.verticalCenter: parent.verticalCenter
                    }
                }

                Rectangle {
                    width: 44
                    height: 24
                    radius: 6
                    color: "#211f30"
                    border.color: "#ffffff15"
                    Text {
                        anchors.centerIn: parent
                        text: "ESC"
                        color: "#a7a9be"
                        font.pixelSize: 10
                        font.bold: true
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                height: 1
                color: "#ffffff0f"
            }

            // Results List
            ListView {
                id: resultsList
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                model: paletteRoot.filteredResults
                currentIndex: paletteRoot.selectedIndex
                spacing: 4

                delegate: Rectangle {
                    width: resultsList.width
                    height: 44
                    radius: 8
                    color: (index === paletteRoot.selectedIndex) ? "#6366f126" : (rowMouse.containsMouse ? "#ffffff08" : "transparent")
                    border.color: (index === paletteRoot.selectedIndex) ? "#818cf855" : "transparent"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 12
                        anchors.rightMargin: 12
                        spacing: 12

                        Text {
                            text: modelData.icon || "•"
                            font.pixelSize: 16
                        }

                        Text {
                            text: modelData.label
                            color: (index === paletteRoot.selectedIndex) ? "#ffffff" : "#e2e8f0"
                            font.pixelSize: 13
                            font.bold: (index === paletteRoot.selectedIndex)
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }

                        Rectangle {
                            height: 22
                            radius: 4
                            color: "#ffffff0a"
                            border.color: "#ffffff10"
                            Layout.preferredWidth: catText.contentWidth + 12
                            Text {
                                id: catText
                                anchors.centerIn: parent
                                text: modelData.category || "Ação"
                                color: "#94a3b8"
                                font.pixelSize: 10
                            }
                        }
                    }

                    MouseArea {
                        id: rowMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            paletteRoot.selectedIndex = index
                            paletteRoot.executeSelected()
                        }
                    }
                }
            }
        }
    }
}

