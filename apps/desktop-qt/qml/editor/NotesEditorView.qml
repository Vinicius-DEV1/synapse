import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: notesRoot
    color: "#0f0e17" // bg-dark-bg

    property string selectedPageId: ""
    property string activeTitle: "Selecione uma nota"
    property string activeContent: ""
    property string activeIcon: "📄"
    property string activeDate: ""
    property var pinnedPages: []
    property var pageTree: []
    property var collapsedNodeMap: ({})
    property string searchQuery: ""
    property bool isDirty: false

    Component.onCompleted: {
        loadPages()
    }

    function loadPages() {
        pinnedPages = dataController.getPinnedPages()
        pageTree = dataController.getPageTree(searchQuery)
        
        if (selectedPageId === "") {
            if (pinnedPages.length > 0) {
                selectPage(pinnedPages[0].id)
            } else if (pageTree.length > 0) {
                selectPage(pageTree[0].id)
            }
        }
    }

    function toggleNodeCollapse(pageId) {
        var copy = Object.assign({}, collapsedNodeMap)
        if (copy[pageId]) {
            delete copy[pageId]
        } else {
            copy[pageId] = true
        }
        collapsedNodeMap = copy
    }

    function isNodeVisible(page) {
        if (!page) return false
        if (!page.depth || page.depth === 0) return true
        
        // Walk ancestors to verify none are collapsed
        var pid = page.parent_id
        while (pid && pid !== "" && pid !== "null") {
            if (collapsedNodeMap[pid]) {
                return false
            }
            var found = false
            for (var i = 0; i < pageTree.length; ++i) {
                if (pageTree[i].id === pid) {
                    pid = pageTree[i].parent_id
                    found = true
                    break
                }
            }
            if (!found) break
        }
        return true
    }

    function selectPage(pageId) {
        if (isDirty && selectedPageId !== "" && selectedPageId !== pageId) {
            saveActiveNote()
        }
        selectedPageId = pageId
        var p = dataController.getPage(pageId)
        if (p && p.id) {
            activeTitle = p.title || "Sem título"
            activeContent = p.content || ""
            activeIcon = p.icon || "📄"
            activeDate = p.updated_at ? p.updated_at.substring(0, 10) : ""
            noteTitleInput.text = activeTitle
            noteEditorArea.text = activeContent
            isDirty = false
        }
    }

    function saveActiveNote() {
        if (!selectedPageId) return
        dataController.savePage(selectedPageId, noteTitleInput.text, noteEditorArea.text, activeIcon)
        isDirty = false
        pinnedPages = dataController.getPinnedPages()
        pageTree = dataController.getPageTree(searchQuery)
    }

    function createNewRootNote() {
        var newId = dataController.createSubPage("", "Nova Nota", "📄")
        if (newId) {
            loadPages()
            selectPage(newId)
        }
    }

    function createNewSubNote(parentId) {
        var newId = dataController.createSubPage(parentId, "Nova Sub-página", "📄")
        if (newId) {
            // Ensure parent is expanded
            var copy = Object.assign({}, collapsedNodeMap)
            delete copy[parentId]
            collapsedNodeMap = copy

            loadPages()
            selectPage(newId)
        }
    }

    function togglePin(pageId) {
        dataController.togglePinPage(pageId)
        loadPages()
    }

    function deleteActiveNote() {
        if (!selectedPageId) return
        dataController.deletePage(selectedPageId)
        selectedPageId = ""
        loadPages()
    }

    function insertFormatting(prefix, suffix) {
        var start = noteEditorArea.selectionStart
        var end = noteEditorArea.selectionEnd
        var oldText = noteEditorArea.text
        var selected = oldText.substring(start, end)
        var replacement = prefix + selected + suffix
        noteEditorArea.text = oldText.substring(0, start) + replacement + oldText.substring(end)
        noteEditorArea.cursorPosition = start + replacement.length
        isDirty = true
    }

    // Auto-save debounce timer
    Timer {
        id: autoSaveTimer
        interval: 1500
        repeat: false
        onTriggered: {
            if (notesRoot.isDirty) {
                notesRoot.saveActiveNote()
            }
        }
    }

    // Keyboard shortcut Ctrl+S / ⌘S
    Shortcut {
        sequences: ["Ctrl+S", "Cmd+S"]
        onActivated: notesRoot.saveActiveNote()
    }

    RowLayout {
        anchors.fill: parent
        spacing: 0

        // ===================================================================
        // Left Note Explorer Panel (Width 300px, bg-dark-card)
        // ===================================================================
        Rectangle {
            Layout.preferredWidth: 300
            Layout.fillHeight: true
            color: "#161524" // bg-dark-card
            border.color: "#ffffff0f"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 10

                // Header with live page count & + Nova Página button
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Text {
                        text: "Caderno • Notas"
                        color: "#fffffe"
                        font.pixelSize: 15
                        font.bold: true
                    }

                    Item { Layout.fillWidth: true }

                    // + Nova Página Button
                    Rectangle {
                        width: 28; height: 28; radius: 6
                        color: "#6366f1"

                        Text {
                            anchors.centerIn: parent
                            text: "+"
                            color: "#ffffff"
                            font.pixelSize: 18
                            font.bold: true
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: notesRoot.createNewRootNote()
                        }
                    }
                }

                // Search Bar (⌘K)
                Rectangle {
                    Layout.fillWidth: true
                    height: 34
                    radius: 8
                    color: "#15141b"
                    border.color: searchInput.activeFocus ? "#8b5cf680" : "#ffffff12"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 10
                        anchors.rightMargin: 10
                        spacing: 8

                        Text { text: "🔍"; color: "#a7a9be"; font.pixelSize: 11 }

                        TextInput {
                            id: searchInput
                            Layout.fillWidth: true
                            color: "#fffffe"
                            font.pixelSize: 12
                            selectByMouse: true
                            onTextChanged: {
                                notesRoot.searchQuery = text
                                notesRoot.loadPages()
                            }

                            Text {
                                text: "Buscar páginas..."
                                color: "#64748b"
                                font.pixelSize: 12
                                visible: !searchInput.text && !searchInput.activeFocus
                            }
                        }

                        Rectangle {
                            width: 24; height: 18; radius: 4
                            color: "#00000033"
                            Text {
                                anchors.centerIn: parent
                                text: "⌘K"
                                color: "#ffffff40"
                                font.pixelSize: 9
                                font.family: "Monospace"
                            }
                        }
                    }
                }

                // Scrollable Page Tree with Pinned and Hierarchical Pages
                ScrollView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    contentWidth: width

                    ColumnLayout {
                        width: parent.width
                        spacing: 12

                        // ---------------------------------------------------
                        // Section 1: Pinned Pages (📌 FIXADOS)
                        // ---------------------------------------------------
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4
                            visible: notesRoot.pinnedPages.length > 0

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 6
                                Text { text: "📌"; font.pixelSize: 11 }
                                Text {
                                    text: "FIXADOS"
                                    color: "#64748b"
                                    font.pixelSize: 11
                                    font.bold: true
                                    font.letterSpacing: 1.1
                                }
                            }

                            Repeater {
                                model: notesRoot.pinnedPages

                                delegate: Rectangle {
                                    id: pinnedDelegate
                                    property bool isSelected: notesRoot.selectedPageId === modelData.id
                                    Layout.fillWidth: true
                                    height: 34
                                    radius: 6
                                    color: isSelected ? "#8b5cf61a" : (pinnedMouse.containsMouse ? "#ffffff0a" : "transparent")
                                    border.color: isSelected ? "#8b5cf64d" : "transparent"
                                    border.width: 1

                                    RowLayout {
                                        anchors.fill: parent
                                        anchors.leftMargin: 8
                                        anchors.rightMargin: 8
                                        spacing: 8

                                        Text { text: modelData.icon || "📄"; font.pixelSize: 13 }
                                        Text {
                                            Layout.fillWidth: true
                                            text: modelData.title || "Sem título"
                                            color: pinnedDelegate.isSelected ? "#c4b5fd" : (pinnedMouse.containsMouse ? "#fffffe" : "#a7a9be")
                                            font.pixelSize: 13
                                            font.bold: pinnedDelegate.isSelected
                                            elide: Text.ElideRight
                                        }

                                        // Hover Action: Unpin
                                        Rectangle {
                                            width: 20; height: 20; radius: 4
                                            color: "transparent"
                                            visible: pinnedMouse.containsMouse

                                            Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 10 }
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: notesRoot.togglePin(modelData.id)
                                            }
                                        }
                                    }

                                    MouseArea {
                                        id: pinnedMouse
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: notesRoot.selectPage(modelData.id)
                                    }
                                }
                            }
                        }

                        // Divider between Pinned and Pages
                        Rectangle {
                            visible: notesRoot.pinnedPages.length > 0
                            Layout.fillWidth: true
                            height: 1
                            color: "#ffffff0a"
                        }

                        // ---------------------------------------------------
                        // Section 2: Hierarchical Pages Tree (PÁGINAS)
                        // ---------------------------------------------------
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            Text {
                                text: "PÁGINAS"
                                color: "#64748b"
                                font.pixelSize: 11
                                font.bold: true
                                font.letterSpacing: 1.1
                            }

                            Repeater {
                                model: notesRoot.pageTree

                                delegate: Item {
                                    id: treeItem
                                    property bool isVisibleInTree: notesRoot.isNodeVisible(modelData)
                                    property bool isCollapsed: notesRoot.collapsedNodeMap[modelData.id] === true
                                    property bool isSelected: notesRoot.selectedPageId === modelData.id
                                    property int depth: modelData.depth || 0

                                    visible: isVisibleInTree
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: isVisibleInTree ? 32 : 0

                                    Rectangle {
                                        anchors.left: parent.left
                                        anchors.right: parent.right
                                        anchors.top: parent.top
                                        anchors.bottom: parent.bottom
                                        anchors.leftMargin: treeItem.depth * 16
                                        radius: 6
                                        color: treeItem.isSelected ? "#8b5cf61a" : (treeMouse.containsMouse ? "#ffffff0a" : "transparent")
                                        border.color: treeItem.isSelected ? "#8b5cf64d" : "transparent"
                                        border.width: 1

                                        RowLayout {
                                            anchors.fill: parent
                                            anchors.leftMargin: 4
                                            anchors.rightMargin: 6
                                            spacing: 4

                                            // Chevron toggle
                                            Item {
                                                width: 18; height: 18
                                                Text {
                                                    anchors.centerIn: parent
                                                    text: treeItem.isCollapsed ? "▶" : "▼"
                                                    font.pixelSize: 9
                                                    color: "#64748b"
                                                    visible: modelData.has_children === true
                                                }
                                                MouseArea {
                                                    anchors.fill: parent
                                                    cursorShape: Qt.PointingHandCursor
                                                    enabled: modelData.has_children === true
                                                    onClicked: notesRoot.toggleNodeCollapse(modelData.id)
                                                }
                                            }

                                            // Page Icon
                                            Text {
                                                text: modelData.icon || "📄"
                                                font.pixelSize: 13
                                            }

                                            // Page Title
                                            Text {
                                                Layout.fillWidth: true
                                                text: modelData.title || "Sem título"
                                                color: treeItem.isSelected ? "#c4b5fd" : (treeMouse.containsMouse ? "#fffffe" : "#a7a9be")
                                                font.pixelSize: 13
                                                font.bold: treeItem.isSelected
                                                elide: Text.ElideRight
                                            }

                                            // Hover Actions: [+] Criar subpágina | [📌] Fixar | [🗑️] Excluir
                                            RowLayout {
                                                spacing: 2
                                                visible: treeMouse.containsMouse

                                                // [+] Add Sub-page
                                                Rectangle {
                                                    width: 18; height: 18; radius: 4; color: "#ffffff10"
                                                    Text { anchors.centerIn: parent; text: "+"; color: "#a7a9be"; font.pixelSize: 13; font.bold: true }
                                                    MouseArea {
                                                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                                        onClicked: notesRoot.createNewSubNote(modelData.id)
                                                    }
                                                }

                                                // [📌] Toggle Pin
                                                Rectangle {
                                                    width: 18; height: 18; radius: 4; color: "#ffffff10"
                                                    Text { anchors.centerIn: parent; text: "📌"; font.pixelSize: 9 }
                                                    MouseArea {
                                                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                                        onClicked: notesRoot.togglePin(modelData.id)
                                                    }
                                                }
                                            }
                                        }

                                        MouseArea {
                                            id: treeMouse
                                            anchors.fill: parent
                                            z: -1
                                            hoverEnabled: true
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: notesRoot.selectPage(modelData.id)
                                        }
                                    }
                                }
                            }
                        }

                        Item { height: 20 }
                    }
                }
            }
        }

        // ===================================================================
        // Right Note Reading & Editing Canvas
        // ===================================================================
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            contentWidth: width

            ColumnLayout {
                width: Math.min(parent.width - 64, 880)
                anchors.horizontalCenter: parent.horizontalCenter
                spacing: 20

                Item { height: 12 } // Top spacing

                // Top Actions Row: Page Icon + Status + Save button + Delete button
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    // Emoji Icon Button
                    Rectangle {
                        width: 44; height: 44; radius: 10
                        color: "#1a1924"
                        border.color: "#ffffff12"

                        Text {
                            anchors.centerIn: parent
                            text: notesRoot.activeIcon
                            font.pixelSize: 24
                        }
                    }

                    Item { Layout.fillWidth: true }

                    // Save Status / Save Button
                    Rectangle {
                        width: 130; height: 36; radius: 8
                        color: notesRoot.isDirty ? "#6366f1" : "#10b98118"
                        border.color: notesRoot.isDirty ? "#4f46e5" : "#10b98133"

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text {
                                text: notesRoot.isDirty ? "💾" : "✓"
                                color: notesRoot.isDirty ? "#ffffff" : "#34d399"
                                font.pixelSize: 12
                                font.bold: true
                            }
                            Text {
                                text: notesRoot.isDirty ? "Salvar Nota" : "Salvo"
                                color: notesRoot.isDirty ? "#ffffff" : "#34d399"
                                font.pixelSize: 12
                                font.bold: true
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: notesRoot.saveActiveNote()
                        }
                    }

                    // Delete Button
                    Rectangle {
                        width: 36; height: 36; radius: 8
                        color: "#f43f5e18"
                        border.color: "#f43f5e33"

                        Text {
                            anchors.centerIn: parent
                            text: "🗑️"
                            font.pixelSize: 13
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: notesRoot.deleteActiveNote()
                        }
                    }
                }

                // Borderless Document Title Input
                TextField {
                    id: noteTitleInput
                    Layout.fillWidth: true
                    text: notesRoot.activeTitle
                    color: "#fffffe"
                    font.pixelSize: 28
                    font.bold: true
                    background: null
                    selectByMouse: true
                    placeholderText: "Sem título"
                    placeholderTextColor: "#64748b"
                    onTextChanged: {
                        if (text !== notesRoot.activeTitle) {
                            notesRoot.isDirty = true
                            autoSaveTimer.restart()
                        }
                    }
                }

                // Metadata Line
                RowLayout {
                    spacing: 12
                    Text {
                        text: "📅 " + (notesRoot.activeDate || "Hoje")
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                    Text { text: "•"; color: "#3f3f46" }
                    Text {
                        text: "📝 " + (noteEditorArea.text.trim().length > 0 ? noteEditorArea.text.trim().split(/\s+/).length : 0) + " palavras"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                    Text { text: "•"; color: "#3f3f46" }
                    Text {
                        text: "🔤 " + noteEditorArea.text.length + " caracteres"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                    Text { text: "•"; color: "#3f3f46" }
                    Text {
                        text: "ID: " + notesRoot.selectedPageId
                        color: "#64748b"
                        font.pixelSize: 11
                        font.family: "Monospace"
                    }
                }

                // Formatting Toolbar
                Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 8
                    color: "#161524"
                    border.color: "#ffffff0f"

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 8
                        anchors.rightMargin: 8
                        spacing: 4

                        // Bold
                        Rectangle {
                            width: 28; height: 26; radius: 4; color: "#ffffff08"
                            Text { anchors.centerIn: parent; text: "B"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: notesRoot.insertFormatting("**", "**") }
                        }
                        // Italic
                        Rectangle {
                            width: 28; height: 26; radius: 4; color: "#ffffff08"
                            Text { anchors.centerIn: parent; text: "I"; color: "#ffffff"; font.pixelSize: 12; font.italic: true }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: notesRoot.insertFormatting("*", "*") }
                        }
                        // Strikethrough
                        Rectangle {
                            width: 28; height: 26; radius: 4; color: "#ffffff08"
                            Text { anchors.centerIn: parent; text: "S"; color: "#ffffff"; font.pixelSize: 12; font.strikeout: true }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: notesRoot.insertFormatting("~~", "~~") }
                        }
                        // Code
                        Rectangle {
                            width: 28; height: 26; radius: 4; color: "#ffffff08"
                            Text { anchors.centerIn: parent; text: "</>"; color: "#c4b5fd"; font.pixelSize: 10 }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: notesRoot.insertFormatting("`", "`") }
                        }

                        Rectangle { width: 1; height: 16; color: "#ffffff15" }

                        // H1
                        Rectangle {
                            width: 28; height: 26; radius: 4; color: "#ffffff08"
                            Text { anchors.centerIn: parent; text: "H1"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: notesRoot.insertFormatting("# ", "\n") }
                        }
                        // H2
                        Rectangle {
                            width: 28; height: 26; radius: 4; color: "#ffffff08"
                            Text { anchors.centerIn: parent; text: "H2"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: notesRoot.insertFormatting("## ", "\n") }
                        }
                        // Bullet List
                        Rectangle {
                            width: 28; height: 26; radius: 4; color: "#ffffff08"
                            Text { anchors.centerIn: parent; text: "•"; color: "#ffffff"; font.pixelSize: 14 }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: notesRoot.insertFormatting("- ", "\n") }
                        }
                        // Blockquote
                        Rectangle {
                            width: 28; height: 26; radius: 4; color: "#ffffff08"
                            Text { anchors.centerIn: parent; text: "”"; color: "#ffffff"; font.pixelSize: 14 }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: notesRoot.insertFormatting("> ", "\n") }
                        }
                        // Callout Note
                        Rectangle {
                            width: 32; height: 26; radius: 4; color: "#ffffff08"
                            Text { anchors.centerIn: parent; text: "ℹ️"; font.pixelSize: 11 }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: notesRoot.insertFormatting("> [!NOTE]\n> ", "\n") }
                        }
                        // Callout Warning
                        Rectangle {
                            width: 32; height: 26; radius: 4; color: "#ffffff08"
                            Text { anchors.centerIn: parent; text: "⚠️"; font.pixelSize: 11 }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: notesRoot.insertFormatting("> [!WARNING]\n> ", "\n") }
                        }
                        // Code Block
                        Rectangle {
                            width: 32; height: 26; radius: 4; color: "#ffffff08"
                            Text { anchors.centerIn: parent; text: "{ }"; color: "#a78bfa"; font.pixelSize: 11; font.bold: true }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: notesRoot.insertFormatting("```\n", "\n```") }
                        }
                    }
                }

                // Editor Surface
                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: Math.max(480, noteEditorArea.implicitHeight + 40)
                    radius: 12
                    color: "#1a1924" // bg-dark-card
                    border.color: noteEditorArea.activeFocus ? "#8b5cf666" : "#ffffff0f"
                    border.width: 1

                    TextArea {
                        id: noteEditorArea
                        anchors.fill: parent
                        anchors.margins: 18
                        text: notesRoot.activeContent
                        color: "#fffffe"
                        font.pixelSize: 15
                        font.family: "Inter, -apple-system, sans-serif"
                        wrapMode: Text.Wrap
                        selectByMouse: true
                        background: null
                        onTextChanged: {
                            if (text !== notesRoot.activeContent) {
                                notesRoot.isDirty = true
                                autoSaveTimer.restart()
                            }
                        }
                    }
                }

                Item { height: 48 } // Bottom breathing room
            }
        }
    }
}
