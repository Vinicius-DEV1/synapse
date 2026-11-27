import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: deletionRoot
    objectName: "notesRichImageDeletion"

    property var textEditor
    property var textOperations
    property var commitTimer
    property string pageId: ""
    property bool active: false

    signal contentModified()

    function requestDelete(position) {
        if (!active || !textEditor || !textOperations) return false
        var dataUrl = textOperations.richImageData(textEditor.textDocument, position)
        if (!dataUrl) return false
        deleteDialog.openForImage(position, dataUrl, pageId)
        return true
    }

    function handleKey(key) {
        if (key !== Qt.Key_Backspace && key !== Qt.Key_Delete) return false
        if (!active || !textEditor || !textOperations) return false

        var selectionStart = textEditor.selectionStart
        var selectionEnd = textEditor.selectionEnd
        if (selectionEnd > selectionStart) {
            var selected = textOperations.richImageAt(
                        textEditor.textDocument, textEditor.cursorPosition, selectionStart, selectionEnd)
            if (selectionEnd - selectionStart !== 1 || !selected.valid ||
                    Number(selected.position) !== selectionStart) return false
            return requestDelete(Number(selected.position))
        }

        var backward = key === Qt.Key_Backspace
        var adjacentPosition = textOperations.adjacentRichImagePosition(
                    textEditor.textDocument, textEditor.cursorPosition, backward)
        if (adjacentPosition < 0) return false
        textEditor.select(adjacentPosition, adjacentPosition + 1)
        textEditor.forceActiveFocus()
        return true
    }

    function confirmDelete(position, dataUrl, requestedPageId) {
        if (!active || String(requestedPageId) !== String(pageId) || !textOperations || !textEditor)
            return false
        var current = textOperations.richImageAt(textEditor.textDocument, position, position, position)
        if (!current.valid || Number(current.position) !== Number(position) ||
                textOperations.richImageData(textEditor.textDocument, position) !== String(dataUrl))
            return false
        if (!textOperations.removeRichImage(textEditor.textDocument, position)) return false
        textEditor.cursorPosition = position
        textEditor.forceActiveFocus()
        if (commitTimer) commitTimer.restart()
        contentModified()
        return true
    }

    onActiveChanged: if (!active) deleteDialog.close()
    onPageIdChanged: deleteDialog.close()

    Connections {
        target: deletionRoot.textEditor
        function onTextChanged() {
            if (deleteDialog.visible) deleteDialog.close()
        }
    }

    Dialog {
        id: deleteDialog
        objectName: "notesRichImageDeleteDialog"
        modal: true
        focus: true
        anchors.centerIn: parent
        width: Math.max(0, Math.min(deletionRoot.width - 32, 384))
        padding: 0
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        standardButtons: Dialog.NoButton

        property int imagePosition: -1
        property string imageData: ""
        property string requestedPageId: ""

        function openForImage(position, dataUrl, requestedPage) {
            imagePosition = position
            imageData = String(dataUrl || "")
            requestedPageId = String(requestedPage || "")
            open()
        }

        function confirmRemoval() {
            if (imagePosition < 0 || imageData.length === 0) return
            deletionRoot.confirmDelete(imagePosition, imageData, requestedPageId)
            close()
        }

        function handleKey(event) {
            if (event.key === Qt.Key_Escape) {
                close()
                return true
            }
            if (event.key === Qt.Key_Enter || event.key === Qt.Key_Return ||
                    event.key === Qt.Key_Backspace || event.key === Qt.Key_Delete) {
                confirmRemoval()
                return true
            }
            return false
        }

        onOpened: confirmButton.forceActiveFocus()

        background: Rectangle {
            color: "#f20f0e17"
            radius: 12
            border.color: "#1affffff"
        }

        header: Rectangle {
            objectName: "notesRichImageDeleteHeader"
            implicitHeight: 60
            color: "#0dffffff"
            radius: 12
            Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: "#0dffffff" }
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 16
                anchors.rightMargin: 8
                spacing: 8
                Canvas {
                    Layout.preferredWidth: 20
                    Layout.preferredHeight: 20
                    antialiasing: true
                    onPaint: {
                        var ctx = getContext("2d")
                        ctx.clearRect(0, 0, width, height)
                        ctx.strokeStyle = "#f87171"
                        ctx.lineWidth = 2
                        ctx.lineJoin = "round"
                        ctx.beginPath()
                        ctx.moveTo(10, 2)
                        ctx.lineTo(19, 18)
                        ctx.lineTo(1, 18)
                        ctx.closePath()
                        ctx.moveTo(10, 7)
                        ctx.lineTo(10, 12)
                        ctx.moveTo(10, 15.5)
                        ctx.lineTo(10, 15.6)
                        ctx.stroke()
                    }
                }
                Label {
                    objectName: "notesRichImageDeleteTitle"
                    Layout.fillWidth: true
                    text: qsTr("Excluir Imagem")
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.weight: Font.Medium
                }
                ToolButton {
                    id: closeButton
                    objectName: "notesRichImageDeleteCloseButton"
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                    Accessible.name: qsTr("Cancelar e fechar")
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Cancelar e fechar (não excluir)")
                    Keys.priority: Keys.BeforeItem
                    Keys.onPressed: function(event) {
                        if (deleteDialog.handleKey(event)) event.accepted = true
                    }
                    onClicked: deleteDialog.close()
                    background: Rectangle {
                        radius: 6
                        color: closeButton.hovered ? "#1affffff" : "transparent"
                    }
                    contentItem: AppIcon {
                        anchors.centerIn: parent
                        name: "close"
                        color: "#a7a9be"
                        width: 20
                        height: 20
                    }
                }
            }
        }

        contentItem: ColumnLayout {
            spacing: 8
            Label {
                objectName: "notesRichImageDeletePrompt"
                Layout.fillWidth: true
                wrapMode: Text.Wrap
                leftPadding: 20
                rightPadding: 20
                topPadding: 20
                color: "#fffffe"
                font.pixelSize: 14
                text: qsTr("Deseja realmente excluir esta imagem?")
            }
            Label {
                objectName: "notesRichImageDeleteDescription"
                Layout.fillWidth: true
                wrapMode: Text.Wrap
                leftPadding: 20
                rightPadding: 20
                bottomPadding: 20
                color: "#a7a9be"
                font.pixelSize: 12
                text: qsTr("Esta ação removerá a imagem selecionada do documento.")
            }
        }

        footer: Rectangle {
            implicitHeight: 64
            color: "#33000000"
            Rectangle { anchors.top: parent.top; width: parent.width; height: 1; color: "#0dffffff" }
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 16
                anchors.rightMargin: 16
                spacing: 8
                Item { Layout.fillWidth: true }
                Button {
                    id: cancelButton
                    objectName: "notesRichImageDeleteCancelButton"
                    text: qsTr("Cancelar")
                    Accessible.name: qsTr("Cancelar")
                    Keys.priority: Keys.BeforeItem
                    Keys.onPressed: function(event) {
                        if (deleteDialog.handleKey(event)) event.accepted = true
                    }
                    onClicked: deleteDialog.close()
                    background: Rectangle {
                        radius: 8
                        color: cancelButton.hovered ? "#0dffffff" : "transparent"
                    }
                    contentItem: Label {
                        text: cancelButton.text
                        color: "#a7a9be"
                        font.pixelSize: 14
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: 16
                        rightPadding: 16
                    }
                }
                Button {
                    id: confirmButton
                    objectName: "notesRichImageDeleteConfirmButton"
                    text: qsTr("Excluir")
                    Accessible.name: qsTr("Confirmar exclusão da imagem")
                    Keys.priority: Keys.BeforeItem
                    Keys.onPressed: function(event) {
                        if (deleteDialog.handleKey(event)) event.accepted = true
                    }
                    onClicked: deleteDialog.confirmRemoval()
                    background: Rectangle {
                        radius: 8
                        color: confirmButton.hovered ? "#4def4444" : "#33ef4444"
                        border.color: "#4def4444"
                    }
                    contentItem: Label {
                        text: confirmButton.text
                        color: confirmButton.hovered ? "#fecdd3" : "#fda4af"
                        font.pixelSize: 14
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: 16
                        rightPadding: 16
                    }
                }
            }
        }
    }
}
