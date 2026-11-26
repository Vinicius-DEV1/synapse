import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: editorRoot
    objectName: "notesFileMarkdownEditor"
    anchors.fill: parent
    z: 4
    visible: false
    color: "#0f0f11"

    property string fileName: ""
    property string originalContent: ""
    property string content: ""
    property string errorMessage: ""
    property string infoMessage: ""
    property bool saving: false
    readonly property bool dirty: content !== originalContent
    readonly property int lineCount: content.split("\n").length
    readonly property int wordCount: content.trim().length === 0 ? 0 : content.trim().split(/\s+/).length

    signal saveRequested(string content)
    signal cancelRequested()

    function openForFile(name, text) {
        fileName = String(name || "")
        originalContent = String(text || "")
        content = originalContent
        errorMessage = ""
        infoMessage = ""
        saving = false
        visible = true
        editor.forceActiveFocus()
    }

    function closeAfterSave() {
        originalContent = content
        errorMessage = ""
        infoMessage = ""
        visible = false
    }

    Shortcut {
        sequence: "Ctrl+S"
        context: Qt.WindowShortcut
        enabled: editorRoot.visible && editorRoot.dirty && !editorRoot.saving
        onActivated: editorRoot.saveRequested(editorRoot.content)
    }

    Shortcut {
        sequence: "Escape"
        context: Qt.WindowShortcut
        enabled: editorRoot.visible && !editorRoot.saving && !discardDialog.visible
        onActivated: {
            if (editorRoot.dirty) discardDialog.open()
            else editorRoot.cancelRequested()
        }
    }

    ColumnLayout {
        anchors.fill: parent

        RowLayout {
            Layout.fillWidth: true
            Layout.preferredHeight: 56
            Layout.leftMargin: 20
            Layout.rightMargin: 20
            spacing: 10
            Rectangle {
                width: 28
                height: 28
                radius: 8
                color: "#1f1f23"
                Text { anchors.centerIn: parent; text: "✎"; color: "#a1a1aa"; font.pixelSize: 14 }
            }
            Label {
                Layout.fillWidth: true
                text: qsTr("Editando:") + " " + editorRoot.fileName
                color: "#e4e4e7"
                font.pixelSize: 12
                elide: Text.ElideRight
            }
            Label {
                visible: editorRoot.dirty
                text: qsTr("Modificado")
                color: "#fbbf24"
                font.pixelSize: 10
                leftPadding: 8
                rightPadding: 8
                topPadding: 3
                bottomPadding: 3
                background: Rectangle { radius: 10; color: "#26f59e0b"; border.color: "#33f59e0b" }
            }
            Label {
                text: qsTr("Ctrl+S para salvar • Esc para sair")
                color: "#71717a"
                font.pixelSize: 10
            }
            Button {
                objectName: "notesFileMarkdownCancelButton"
                text: qsTr("Cancelar")
                enabled: !editorRoot.saving
                onClicked: editorRoot.dirty ? discardDialog.open() : editorRoot.cancelRequested()
            }
            Button {
                objectName: "notesFileMarkdownSaveButton"
                text: editorRoot.saving ? qsTr("Salvando…") : qsTr("Salvar")
                highlighted: true
                enabled: editorRoot.dirty && !editorRoot.saving
                onClicked: editorRoot.saveRequested(editorRoot.content)
            }
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: "#0cffffff" }

        Label {
            Layout.fillWidth: true
            Layout.leftMargin: 24
            Layout.rightMargin: 24
            visible: editorRoot.errorMessage.length > 0
            text: editorRoot.errorMessage
            color: "#fda4af"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }

        Label {
            Layout.fillWidth: true
            Layout.leftMargin: 24
            Layout.rightMargin: 24
            visible: editorRoot.infoMessage.length > 0
            text: editorRoot.infoMessage
            color: "#a7f3d0"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }

        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true
            TextArea {
                id: editor
                objectName: "notesFileMarkdownTextArea"
                anchors.centerIn: parent
                width: Math.min(parent.width, 768)
                height: parent.height
                text: editorRoot.content
                placeholderText: qsTr("Digite ou edite o conteúdo em Markdown aqui...")
                readOnly: editorRoot.saving
                selectByMouse: true
                wrapMode: TextEdit.Wrap
                textFormat: TextEdit.PlainText
                color: "#e4e4e7"
                selectedTextColor: "#f4f4f5"
                selectionColor: "#4d6366f1"
                font.family: "monospace"
                font.pixelSize: 13
                background: Rectangle { color: "transparent" }
                onTextChanged: editorRoot.content = text
                Keys.onPressed: function(event) {
                    if (event.key !== Qt.Key_Tab) return
                    event.accepted = true
                    var start = selectionStart
                    var end = selectionEnd
                    var next = text.substring(0, start) + "  " + text.substring(end)
                    text = next
                    cursorPosition = start + 2
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 34
            color: "#0f0f11"
            border.color: "#0cffffff"
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 24
                anchors.rightMargin: 24
                spacing: 20
                Label { text: qsTr("%1 linhas").arg(editorRoot.lineCount); color: "#71717a"; font.family: "monospace"; font.pixelSize: 10 }
                Label { text: qsTr("%1 palavras").arg(editorRoot.wordCount); color: "#71717a"; font.family: "monospace"; font.pixelSize: 10 }
                Label { text: qsTr("%1 caracteres").arg(editorRoot.content.length); color: "#71717a"; font.family: "monospace"; font.pixelSize: 10 }
                Item { Layout.fillWidth: true }
                Label { text: "Markdown UTF-8"; color: "#71717a"; font.family: "monospace"; font.pixelSize: 10 }
            }
        }
    }

    Dialog {
        id: discardDialog
        objectName: "notesFileMarkdownDiscardDialog"
        parent: Overlay.overlay
        anchors.centerIn: parent
        width: Math.min(parent ? parent.width - 32 : 420, 420)
        modal: true
        focus: true
        padding: 18
        title: qsTr("Descartar alterações?")
        standardButtons: Dialog.NoButton
        closePolicy: Popup.CloseOnEscape
        background: Rectangle { color: "#1a1924"; radius: 12; border.color: "#33ffffff" }
        contentItem: ColumnLayout {
            spacing: 14
            Label {
                Layout.fillWidth: true
                text: qsTr("Você possui alterações não salvas neste documento. Deseja realmente descartá-las e voltar à visualização?")
                color: "#d4d4d8"
                wrapMode: Text.Wrap
            }
            RowLayout {
                Layout.fillWidth: true
                Item { Layout.fillWidth: true }
                Button { objectName: "notesFileMarkdownKeepEditingButton"; text: qsTr("Continuar editando"); onClicked: discardDialog.close() }
                Button {
                    objectName: "notesFileMarkdownDiscardButton"
                    text: qsTr("Descartar")
                    onClicked: {
                        discardDialog.close()
                        editorRoot.cancelRequested()
                    }
                }
            }
        }
    }
}
