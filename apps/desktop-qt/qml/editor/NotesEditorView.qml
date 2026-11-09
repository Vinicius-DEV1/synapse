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
    property var pagesModel: []
    property string searchQuery: ""
    property bool isDirty: false

    Component.onCompleted: {
        loadPages()
    }

    function loadPages() {
        pagesModel = dataController.getPages(searchQuery)
        if (pagesModel.length > 0 && selectedPageId === "") {
            selectPage(pagesModel[0].id)
        }
    }

    function selectPage(pageId) {
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
        loadPages()
    }

    function createNewNote() {
        dataController.savePage("", "Nova Nota", "", "📄")
        loadPages()
        if (pagesModel.length > 0) {
            selectPage(pagesModel[0].id)
        }
    }

    function deleteActiveNote() {
        if (!selectedPageId) return
        dataController.deletePage(selectedPageId)
        selectedPageId = ""
        loadPages()
    }

    RowLayout {
        anchors.fill: parent
        spacing: 0

        // ===================================================================
        // Left Note Explorer Panel (Width 280px)
        // ===================================================================
        Rectangle {
            Layout.preferredWidth: 280
            Layout.fillHeight: true
            color: "#161524" // bg-dark-card
            border.color: "#ffffff0f"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 12

                // Header with live page count & New Note button
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

                    // + Nova Nota Button
                    Rectangle {
                        width: 28; height: 28; radius: 6
                        color: "#7c3aed" // brand-600

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
                            onClicked: notesRoot.createNewNote()
                        }
                    }
                }

                // Search Bar
                Rectangle {
                    Layout.fillWidth: true
                    height: 36
                    radius: 8
                    color: "#15141b"
                    border.color: searchInput.activeFocus ? "#8b5cf680" : "#ffffff12"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 10
                        anchors.rightMargin: 10
                        spacing: 8

                        Text { text: "🔍"; color: "#a7a9be"; font.pixelSize: 12 }

                        TextInput {
                            id: searchInput
                            Layout.fillWidth: true
                            color: "#fffffe"
                            font.pixelSize: 13
                            selectByMouse: true
                            onTextChanged: {
                                notesRoot.searchQuery = text
                                notesRoot.loadPages()
                            }

                            Text {
                                text: "Buscar nas " + notesRoot.pagesModel.length + " notas..."
                                color: "#64748b"
                                font.pixelSize: 13
                                visible: !searchInput.text && !searchInput.activeFocus
                            }
                        }
                    }
                }

                // Pages List View
                ListView {
                    id: pagesListView
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    spacing: 4
                    model: notesRoot.pagesModel

                    delegate: Rectangle {
                        width: pagesListView.width
                        height: 52
                        radius: 8
                        color: {
                            if (notesRoot.selectedPageId === modelData.id) return "#8b5cf61a" // bg-brand-500/10
                            if (itemMouse.containsMouse) return "#ffffff0a"
                            return "transparent"
                        }
                        border.color: notesRoot.selectedPageId === modelData.id ? "#8b5cf64d" : "transparent"
                        border.width: 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 10
                            anchors.rightMargin: 10
                            spacing: 10

                            Text {
                                text: modelData.icon || "📄"
                                font.pixelSize: 15
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2

                                Text {
                                    Layout.fillWidth: true
                                    text: modelData.title || "Sem título"
                                    color: notesRoot.selectedPageId === modelData.id ? "#c4b5fd" : (itemMouse.containsMouse ? "#fffffe" : "#a7a9be")
                                    font.pixelSize: 13
                                    font.bold: notesRoot.selectedPageId === modelData.id
                                    elide: Text.ElideRight
                                }

                                Text {
                                    text: modelData.updated_at ? modelData.updated_at.substring(0, 10) : ""
                                    color: "#64748b"
                                    font.pixelSize: 11
                                }
                            }
                        }

                        MouseArea {
                            id: itemMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: notesRoot.selectPage(modelData.id)
                        }
                    }
                }
            }
        }

        // ===================================================================
        // Right Note Reading & Editing Canvas
        // ===================================================================
        Flickable {
            Layout.fillWidth: true
            Layout.fillHeight: true
            contentWidth: width
            contentHeight: noteContentCol.implicitHeight + 80
            clip: true

            ColumnLayout {
                id: noteContentCol
                width: Math.min(parent.width - 64, 840)
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: parent.top
                anchors.topMargin: 32
                spacing: 20

                // Top Actions Row: Save button + Delete button
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    Text {
                        text: notesRoot.activeIcon
                        font.pixelSize: 28
                    }

                    Item { Layout.fillWidth: true }

                    Rectangle {
                        width: 120; height: 34; radius: 8
                        color: notesRoot.isDirty ? "#7c3aed" : "#27273a"

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text { text: "💾"; font.pixelSize: 12 }
                            Text {
                                text: notesRoot.isDirty ? "Salvar Nota" : "Salvo ✓"
                                color: notesRoot.isDirty ? "#ffffff" : "#a7a9be"
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

                    Rectangle {
                        width: 80; height: 34; radius: 8
                        color: "#f43f5e1a"
                        border.color: "#f43f5e33"

                        Text {
                            anchors.centerIn: parent
                            text: "Excluir"
                            color: "#fb7185"
                            font.pixelSize: 12
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: notesRoot.deleteActiveNote()
                        }
                    }
                }

                // Document Title Input
                TextField {
                    id: noteTitleInput
                    Layout.fillWidth: true
                    text: notesRoot.activeTitle
                    color: "#fffffe"
                    font.pixelSize: 26
                    font.bold: true
                    background: null
                    selectByMouse: true
                    onTextChanged: {
                        if (text !== notesRoot.activeTitle) {
                            notesRoot.isDirty = true
                        }
                    }
                }

                // Date and ID Info
                RowLayout {
                    spacing: 12
                    Text {
                        text: "📅 Atualizado em: " + notesRoot.activeDate
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                    Text { text: "•"; color: "#3f3f46" }
                    Text {
                        text: "Palavras: " + (noteEditorArea.text.trim().length > 0 ? noteEditorArea.text.trim().split(/\s+/).length : 0)
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

                Rectangle {
                    Layout.fillWidth: true
                    height: 1
                    color: "#ffffff0f"
                }

                // Editor Surface
                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: Math.max(360, noteEditorArea.implicitHeight + 40)
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
                            }
                        }
                    }
                }
            }
        }
    }
}
