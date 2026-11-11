import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

RowLayout {
    id: workspace
    anchors.fill: parent
    spacing: 0

    property var collection
    property var actions
    property var dialogs
    readonly property bool searchActive: fileSearchField.activeFocus

    FilesFolderSidebar {
        Layout.preferredWidth: 218
        Layout.minimumWidth: 200
        Layout.fillHeight: true
        folders: workspace.collection.allFolders
        files: workspace.collection.allFiles
        driveCount: workspace.collection.driveCount
        activeSection: workspace.collection.activeSection
        selectedFolderId: workspace.collection.activeFolderId()
        onSectionSelected: function(section) { workspace.collection.openSection(section) }
        onFolderSelected: function(folderId) { workspace.collection.navigateToFolder(folderId) }
        onNewFolderRequested: function(parentId) { workspace.dialogs.openCreateFolder(parentId) }
    }

    ColumnLayout {
        Layout.fillWidth: true
        Layout.fillHeight: true
        Layout.margins: 22
        spacing: 11

        RowLayout {
            Layout.fillWidth: true
            spacing: 8
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3
                Text {
                    text: "Arquivos"
                    color: theme.textDark
                    font.pixelSize: 21
                    font.bold: true
                    font.family: theme.fontFamily
                }
                Text {
                    text: workspace.collection.activeSection === "folders"
                          ? (workspace.collection.folderStack.length ? "Início  /  " + workspace.collection.folderStack.map(function(folder) { return folder.name }).join("  /  ") : "Armazenamento local criptografado")
                          : workspace.collection.activeSection === "all" ? "Todos os arquivos" : workspace.collection.activeSection === "recent" ? "Arquivos recentes" : "Arquivos no Google Drive"
                    color: theme.textSubtext
                    font.pixelSize: 10
                    elide: Text.ElideRight
                }
            }
            ToolButton {
                text: "←"
                enabled: workspace.collection.navigationIndex > 0
                ToolTip.visible: hovered
                ToolTip.text: "Voltar (Alt + Esquerda)"
                onClicked: workspace.collection.navigateHistory(workspace.collection.navigationIndex - 1)
                background: Rectangle { color: parent.hovered ? theme.bgHover : theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 7 }
                contentItem: Text { text: parent.text; color: parent.enabled ? theme.textSubtext : theme.textMuted; font.pixelSize: 15; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            ToolButton {
                text: "→"
                enabled: workspace.collection.navigationIndex + 1 < workspace.collection.navigationHistory.length
                ToolTip.visible: hovered
                ToolTip.text: "Avançar (Alt + Direita)"
                onClicked: workspace.collection.navigateHistory(workspace.collection.navigationIndex + 1)
                background: Rectangle { color: parent.hovered ? theme.bgHover : theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 7 }
                contentItem: Text { text: parent.text; color: parent.enabled ? theme.textSubtext : theme.textMuted; font.pixelSize: 15; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            ToolButton {
                text: "↑"
                enabled: workspace.collection.activeSection === "folders" && workspace.collection.folderStack.length > 0
                ToolTip.visible: hovered
                ToolTip.text: "Subir um nível (Alt + Cima)"
                onClicked: workspace.collection.goUpOneLevel()
                background: Rectangle { color: parent.hovered ? theme.bgHover : theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 7 }
                contentItem: Text { text: parent.text; color: parent.enabled ? theme.textSubtext : theme.textMuted; font.pixelSize: 15; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                text: "Nova pasta"
                onClicked: workspace.dialogs.openCreateFolder(workspace.collection.activeSection === "folders" ? workspace.collection.activeFolderId() : "")
                background: Rectangle { color: parent.hovered ? theme.bgHover : theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 8 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                text: dataController.fileOperationRunning ? "Importando…" : "Importar"
                enabled: !dataController.fileOperationRunning
                onClicked: workspace.dialogs.openImport()
                background: Rectangle { color: parent.enabled ? theme.brand600 : theme.bgDarkSurface; radius: 8 }
                contentItem: Text { text: parent.text; color: "white"; font.bold: true; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 7
            TextField {
                id: fileSearchField
                Layout.fillWidth: true
                placeholderText: "Buscar arquivos e pastas…"
                text: workspace.collection.searchText
                onTextChanged: workspace.collection.searchText = text
                color: theme.textDark
                placeholderTextColor: theme.textMuted
                background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 8 }
            }
            ToolButton {
                visible: workspace.collection.activeSection === "folders" && workspace.collection.searchText.trim().length > 0
                text: workspace.collection.searchAll ? "Tudo" : "Esta pasta"
                ToolTip.visible: hovered
                ToolTip.text: workspace.collection.searchAll ? "Buscar em todo o espaço" : "Buscar apenas nesta pasta"
                onClicked: workspace.collection.searchAll = !workspace.collection.searchAll
                background: Rectangle { color: workspace.collection.searchAll ? theme.activePillBg : theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 7 }
                contentItem: Text { text: parent.text; color: workspace.collection.searchAll ? theme.brand300 : theme.textSubtext; font.pixelSize: 9; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            ToolButton {
                text: workspace.collection.viewMode === "grid" ? "▦" : "☷"
                ToolTip.visible: hovered
                ToolTip.text: workspace.collection.viewMode === "grid" ? "Visualização em tabela" : "Visualização em grade"
                onClicked: workspace.collection.viewMode = workspace.collection.viewMode === "grid" ? "table" : "grid"
                background: Rectangle { color: parent.hovered ? theme.bgHover : theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 7 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 15; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            ToolButton {
                text: "☷"
                ToolTip.visible: hovered
                ToolTip.text: workspace.actions.inspectorOpen ? "Ocultar detalhes" : "Mostrar detalhes"
                onClicked: workspace.actions.inspectorOpen = !workspace.actions.inspectorOpen
                background: Rectangle { color: workspace.actions.inspectorOpen ? theme.activePillBg : parent.hovered ? theme.bgHover : theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 7 }
                contentItem: Text { text: parent.text; color: workspace.actions.inspectorOpen ? theme.brand300 : theme.textSubtext; font.pixelSize: 12; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }

        FilesCategoryFilter {
            Layout.fillWidth: true
            Layout.preferredHeight: 32
            files: workspace.collection.allFiles
            activeCategory: workspace.collection.categoryFilter
            onCategorySelected: function(category) { workspace.collection.categoryFilter = category }
        }

        Text {
            visible: workspace.actions.feedbackText.length > 0
            text: workspace.actions.feedbackText
            color: workspace.actions.feedbackText.toLowerCase().indexOf("could not") !== -1 || workspace.actions.feedbackText.toLowerCase().indexOf("failed") !== -1 ? theme.error : theme.textSubtext
            font.pixelSize: 10
            Layout.fillWidth: true
            wrapMode: Text.Wrap
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 10
            FilesExplorer {
                Layout.fillWidth: true
                Layout.fillHeight: true
                items: workspace.collection.visibleItems
                selectedIds: workspace.collection.selectedIds
                focusedId: workspace.collection.focusedItem && workspace.collection.focusedItem.id ? String(workspace.collection.focusedItem.id) : ""
                viewMode: workspace.collection.viewMode
                sortBy: workspace.collection.sortBy
                sortOrder: workspace.collection.sortOrder
                onItemSelected: function(itemId, isFolder, modifiers) { workspace.collection.selectItem(itemId, isFolder, modifiers) }
                onItemActivated: function(item) {
                    if (item.kind === "folder") workspace.collection.openFolder(item.id)
                    else workspace.actions.previewFile(item.id)
                }
                onItemActionRequested: function(action, item) { workspace.actions.handleItemMenuAction(action, item) }
                onSortRequested: function(key) { workspace.collection.sortByColumn(key) }
            }
            FilesInspector {
                visible: workspace.actions.inspectorOpen
                Layout.preferredWidth: visible ? 250 : 0
                Layout.minimumWidth: visible ? 230 : 0
                Layout.fillHeight: true
                itemData: workspace.collection.focusedItem
                linkedNotes: workspace.actions.linkedNotes
                selectedCount: workspace.collection.selectedIds.length
                onCloseRequested: workspace.actions.inspectorOpen = false
                onRenameRequested: function(item) { workspace.actions.handleItemMenuAction("rename", item) }
                onExportRequested: function(item) { workspace.actions.handleItemMenuAction("export", item) }
                onLinkRequested: function(item) { workspace.actions.handleItemMenuAction("link", item) }
            }
        }

        RowLayout {
            visible: workspace.collection.selectedIds.length > 0 || workspace.actions.clipboardItems.length > 0
            Layout.fillWidth: true
            spacing: 7
            Text { text: workspace.collection.selectedIds.length > 0 ? workspace.collection.selectedIds.length + " selecionados" : ""; color: theme.brand300; font.pixelSize: 10 }
            Item { Layout.fillWidth: true }
            Button {
                text: "Copiar"
                enabled: workspace.collection.selectedIds.length > 0
                onClicked: workspace.actions.setClipboard("copy", null)
                background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 7 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 9; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                text: "Recortar"
                enabled: workspace.collection.selectedIds.length > 0
                onClicked: workspace.actions.setClipboard("cut", null)
                background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 7 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 9; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                text: "Colar"
                enabled: workspace.actions.clipboardItems.length > 0
                onClicked: workspace.actions.pasteClipboard()
                background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 7 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 9; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                text: "Mover"
                enabled: workspace.collection.selectedIds.length > 0
                onClicked: workspace.actions.requestMove(null)
                background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 7 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 9; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                text: "Lixeira"
                enabled: workspace.collection.selectedIds.length > 0
                onClicked: workspace.actions.requestDelete(null)
                background: Rectangle { color: theme.errorBg; border.color: theme.errorBorder; radius: 7 }
                contentItem: Text { text: parent.text; color: theme.error; font.pixelSize: 9; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                text: "Limpar"
                enabled: workspace.collection.selectedIds.length > 0
                onClicked: workspace.collection.clearSelection()
                background: Rectangle { color: "transparent"; radius: 7 }
                contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 9; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
    }
}
