pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

RowLayout {
    id: renameRoot
    property bool editing: false
    property string errorMessage: ""

    signal renameRequested(string nextName)
    signal cancelRequested()
    signal errorCleared()

    visible: editing
    Layout.fillWidth: true
    spacing: 4

    function beginRename(currentName) {
        nameInput.text = String(currentName || "")
        Qt.callLater(function() {
            if (!renameRoot.editing) return
            nameInput.forceActiveFocus()
            var extensionIndex = nameInput.text.lastIndexOf(".")
            if (extensionIndex > 0) nameInput.select(0, extensionIndex)
            else nameInput.selectAll()
        })
    }

    function focusInput() {
        nameInput.forceActiveFocus()
    }

    function submit() {
        renameRequested(String(nameInput.text || "").trim())
    }

    TextField {
        id: nameInput
        Layout.preferredWidth: 220
        Layout.preferredHeight: 26
        color: "#fffffe"
        font.pixelSize: 12
        font.weight: Font.Medium
        leftPadding: 6
        rightPadding: 6
        Accessible.description: renameRoot.errorMessage
        ToolTip.visible: renameRoot.errorMessage.length > 0
        ToolTip.text: renameRoot.errorMessage
        ToolTip.timeout: -1
        onTextEdited: renameRoot.errorCleared()
        onAccepted: renameRoot.submit()
        Keys.onEscapePressed: renameRoot.cancelRequested()
        background: Rectangle {
            radius: 4
            color: "#66000000"
            border.color: "#cc8b5cf6"
            border.width: 1
        }
    }

    ToolButton {
        id: renameConfirmButton
        Layout.preferredWidth: 22
        Layout.preferredHeight: 22
        focusPolicy: Qt.TabFocus
        Accessible.name: qsTr("Salvar nome do arquivo")
        onClicked: renameRoot.submit()
        background: Rectangle {
            radius: 4
            color: renameConfirmButton.hovered || renameConfirmButton.activeFocus ? "#3310b981" : "transparent"
            border.color: renameConfirmButton.activeFocus ? "#9934d399" : "transparent"
            border.width: renameConfirmButton.activeFocus ? 1 : 0
        }
        contentItem: AppIcon {
            anchors.centerIn: parent
            name: "check"
            color: "#34d399"
            width: 13
            height: 13
        }
    }

    ToolButton {
        id: renameCancelButton
        Layout.preferredWidth: 22
        Layout.preferredHeight: 22
        focusPolicy: Qt.TabFocus
        Accessible.name: qsTr("Cancelar renomeação do arquivo")
        onClicked: renameRoot.cancelRequested()
        background: Rectangle {
            radius: 4
            color: renameCancelButton.hovered || renameCancelButton.activeFocus ? "#1affffff" : "transparent"
            border.color: renameCancelButton.activeFocus ? "#998b5cf6" : "transparent"
            border.width: renameCancelButton.activeFocus ? 1 : 0
        }
        contentItem: AppIcon {
            anchors.centerIn: parent
            name: "close"
            color: "#a7a9be"
            width: 12
            height: 12
        }
    }
}
