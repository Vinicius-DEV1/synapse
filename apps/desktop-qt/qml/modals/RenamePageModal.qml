import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

// Rename Page Modal mirroring apps/web-react/src/components/modals/RenamePageModal.tsx
Popup {
    id: renameRoot
    property string pageId: ""
    property string currentTitle: ""
    property bool isSubmitting: false
    signal renamed(string pageId, string newTitle)

    modal: true
    focus: true
    closePolicy: isSubmitting ? Popup.NoAutoClose : (Popup.CloseOnEscape | Popup.CloseOnPressOutside)
    parent: Overlay.overlay
    width: Math.min(420, parent ? parent.width - 32 : 420)
    height: col.implicitHeight + 48
    x: parent ? Math.round((parent.width - width) / 2) : 0
    y: parent ? Math.round((parent.height - height) / 2) : 0
    padding: 24

    Theme { id: theme }

    function openFor(id, title) {
        pageId = id || ""
        currentTitle = title || ""
        isSubmitting = false
        titleField.text = currentTitle
        open()
        Qt.callLater(function() {
            titleField.forceActiveFocus()
            titleField.selectAll()
        })
    }

    function submit() {
        if (isSubmitting) return
        var trimmed = titleField.text.trim()
        if (trimmed.length > 0 && trimmed !== currentTitle && pageId.length > 0) {
            isSubmitting = true
            renamed(pageId, trimmed)
            isSubmitting = false
        }
        close()
    }

    background: Rectangle {
        radius: 16
        color: theme.bgDarkCard
        border.color: theme.borderCard
        border.width: 1
    }

    contentItem: ColumnLayout {
        id: col
        spacing: 14

        RowLayout {
            Layout.fillWidth: true
            Text {
                Layout.fillWidth: true
                text: qsTr("Renomear Página")
                color: theme.textDark
                font.pixelSize: 17
                font.bold: true
            }
            ToolButton {
                text: "×"
                enabled: !renameRoot.isSubmitting
                onClicked: renameRoot.close()
                contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 18; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6
            Text { text: qsTr("Nome da Página"); color: theme.textSubtext; font.pixelSize: 12; font.weight: Font.Medium }
            TextField {
                id: titleField
                Layout.fillWidth: true
                Layout.preferredHeight: 40
                placeholderText: qsTr("Digite o novo nome...")
                color: theme.textDark
                selectByMouse: true
                background: Rectangle {
                    radius: 8
                    color: theme.bgDarkSurface
                    border.color: titleField.activeFocus ? theme.brand500 : theme.borderCard
                }
                onAccepted: renameRoot.submit()
            }
        }

        RowLayout {
            Layout.fillWidth: true
            Item { Layout.fillWidth: true }
            Button {
                text: qsTr("Cancelar")
                enabled: !renameRoot.isSubmitting
                onClicked: renameRoot.close()
                background: Rectangle { color: parent.hovered ? theme.bgHover : "transparent"; radius: 8 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 13; leftPadding: 12; rightPadding: 12; topPadding: 6; bottomPadding: 6 }
            }
            Button {
                text: renameRoot.isSubmitting ? qsTr("Salvando...") : qsTr("Salvar")
                enabled: !renameRoot.isSubmitting && titleField.text.trim().length > 0
                onClicked: renameRoot.submit()
                background: Rectangle { color: parent.enabled ? theme.brand500 : "#403b50"; radius: 8 }
                contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 13; font.weight: Font.Medium; leftPadding: 14; rightPadding: 14; topPadding: 6; bottomPadding: 6 }
            }
        }
    }
}
