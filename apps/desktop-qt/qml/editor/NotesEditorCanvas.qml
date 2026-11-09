import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ScrollView {
    id: canvasRoot
    Layout.fillWidth: true
    Layout.fillHeight: true
    clip: true
    contentWidth: width

    property string selectedPageId: ""
    property string activeTitle: ""
    property string activeContent: ""
    property string activeIcon: "📄"
    property string activeDate: ""
    property bool isDirty: false
    property bool isPreviewMode: false
    property bool isEmojiPickerOpen: false

    signal saveRequested()
    signal deleteRequested()
    signal titleModified(string newTitle)
    signal contentModified(string newContent)
    signal iconModified(string newIcon)
    signal previewToggled(bool preview)
    signal formatRequested(string prefix, string suffix)

    function setEditorText(txt) {
        noteEditorArea.text = txt
    }

    function setTitleText(txt) {
        noteTitleInput.text = txt
    }

    function insertFormatting(prefix, suffix) {
        var start = noteEditorArea.selectionStart
        var end = noteEditorArea.selectionEnd
        var oldText = noteEditorArea.text
        var selected = oldText.substring(start, end)
        var replacement = prefix + selected + suffix
        noteEditorArea.text = oldText.substring(0, start) + replacement + oldText.substring(end)
        noteEditorArea.cursorPosition = start + replacement.length
        canvasRoot.contentModified(noteEditorArea.text)
    }

    ColumnLayout {
        width: Math.min(parent.width - 64, 880)
        anchors.horizontalCenter: parent.horizontalCenter
        spacing: 20

        Item { height: 12 } // Top spacing

        // Top Actions Row: Page Icon + Status + Mode Toggle + Save button + Delete button
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            // Emoji Icon Button
            Rectangle {
                id: emojiBtn
                width: 44; height: 44; radius: 10
                color: canvasRoot.isEmojiPickerOpen ? "#6366f126" : (emojiMouse.containsMouse ? "#211f30" : "#1a1924")
                border.color: canvasRoot.isEmojiPickerOpen ? "#818cf8" : "#ffffff12"
                border.width: 1

                Text {
                    anchors.centerIn: parent
                    text: canvasRoot.activeIcon
                    font.pixelSize: 24
                }

                MouseArea {
                    id: emojiMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: canvasRoot.isEmojiPickerOpen = !canvasRoot.isEmojiPickerOpen
                }
            }

            // Mode Toggle (Editar / Leitura Zen)
            Rectangle {
                width: 154; height: 36; radius: 8
                color: "#161524"
                border.color: "#ffffff12"

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 3
                    spacing: 2

                    Rectangle {
                        Layout.fillWidth: true; Layout.fillHeight: true
                        radius: 6
                        color: !canvasRoot.isPreviewMode ? "#6366f1" : "transparent"
                        Text {
                            anchors.centerIn: parent
                            text: "✏️ Editar"
                            color: !canvasRoot.isPreviewMode ? "#ffffff" : "#a7a9be"
                            font.pixelSize: 11
                            font.bold: !canvasRoot.isPreviewMode
                        }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: canvasRoot.previewToggled(false)
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true; Layout.fillHeight: true
                        radius: 6
                        color: canvasRoot.isPreviewMode ? "#6366f1" : "transparent"
                        Text {
                            anchors.centerIn: parent
                            text: "👁️ Leitura"
                            color: canvasRoot.isPreviewMode ? "#ffffff" : "#a7a9be"
                            font.pixelSize: 11
                            font.bold: canvasRoot.isPreviewMode
                        }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: canvasRoot.previewToggled(true)
                        }
                    }
                }
            }

            Item { Layout.fillWidth: true }

            // Save Status / Save Button
            Rectangle {
                width: 130; height: 36; radius: 8
                color: canvasRoot.isDirty ? "#6366f1" : "#10b98118"
                border.color: canvasRoot.isDirty ? "#4f46e5" : "#10b98133"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text {
                        text: canvasRoot.isDirty ? "💾" : "✓"
                        color: canvasRoot.isDirty ? "#ffffff" : "#34d399"
                        font.pixelSize: 12
                        font.bold: true
                    }
                    Text {
                        text: canvasRoot.isDirty ? "Salvar Nota" : "Salvo"
                        color: canvasRoot.isDirty ? "#ffffff" : "#34d399"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: canvasRoot.saveRequested()
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
                    onClicked: canvasRoot.deleteRequested()
                }
            }
        }

        // Emoji Picker Grid Popover
        Rectangle {
            visible: canvasRoot.isEmojiPickerOpen
            Layout.fillWidth: true
            height: 84
            radius: 12
            color: "#161524"
            border.color: "#818cf84d"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 8

                Repeater {
                    model: ["📄", "💡", "🚀", "📚", "💻", "🎨", "⚡", "🎯", "🔒", "⭐", "🧠", "🔥", "📊", "💰", "🎵", "📝"]
                    delegate: Rectangle {
                        Layout.fillWidth: true
                        height: 36
                        radius: 8
                        color: emMouse.containsMouse ? "#ffffff18" : "#1a1924"
                        border.color: "#ffffff0a"
                        Text { anchors.centerIn: parent; text: modelData; font.pixelSize: 18 }
                        MouseArea {
                            id: emMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                canvasRoot.iconModified(modelData)
                                canvasRoot.isEmojiPickerOpen = false
                            }
                        }
                    }
                }
            }
        }

        // Borderless Document Title Input
        TextField {
            id: noteTitleInput
            Layout.fillWidth: true
            text: canvasRoot.activeTitle
            color: "#fffffe"
            font.pixelSize: 28
            font.bold: true
            background: null
            selectByMouse: true
            placeholderText: "Sem título"
            placeholderTextColor: "#64748b"
            onTextChanged: {
                if (text !== canvasRoot.activeTitle) {
                    canvasRoot.titleModified(text)
                }
            }
        }

        // Metadata Line
        RowLayout {
            spacing: 12
            Text {
                text: "📅 " + (canvasRoot.activeDate || "Hoje")
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
                text: "ID: " + canvasRoot.selectedPageId
                color: "#64748b"
                font.pixelSize: 11
                font.family: "Monospace"
            }
        }

        // Formatting Toolbar (Visible in Edit mode only)
        NotesMarkdownToolbar {
            visible: !canvasRoot.isPreviewMode
            onFormatRequested: function(prefix, suffix) {
                canvasRoot.insertFormatting(prefix, suffix)
            }
        }

        // 1. Editor Surface (Active in Edit mode)
        Rectangle {
            visible: !canvasRoot.isPreviewMode
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
                text: canvasRoot.activeContent
                color: "#fffffe"
                font.pixelSize: 15
                font.family: "Inter, -apple-system, sans-serif"
                wrapMode: Text.Wrap
                selectByMouse: true
                background: null
                onTextChanged: {
                    if (text !== canvasRoot.activeContent) {
                        canvasRoot.contentModified(text)
                    }
                }
            }
        }

        // 2. Zen Markdown Reading Canvas (Active in Preview mode)
        Rectangle {
            visible: canvasRoot.isPreviewMode
            Layout.fillWidth: true
            implicitHeight: Math.max(480, markdownDisplayArea.implicitHeight + 60)
            radius: 12
            color: "#161524" // elevated surface
            border.color: "#ffffff0f"
            border.width: 1

            Text {
                id: markdownDisplayArea
                anchors.fill: parent
                anchors.margins: 28
                text: (noteEditorArea.text || canvasRoot.activeContent || "*Esta nota ainda não possui conteúdo.*")
                textFormat: Text.MarkdownText
                color: "#fffffe"
                font.pixelSize: 15
                font.family: "Inter, -apple-system, sans-serif"
                wrapMode: Text.Wrap
                lineHeight: 1.45
            }
        }

        Item { height: 48 } // Bottom breathing room
    }
}
