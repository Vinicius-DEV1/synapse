import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Item {
    id: linkDialogs

    property var pageChoices: []
    property var linkedNotes: []
    property string fileId: ""
    readonly property bool anyDialogOpen: linkDialog.visible || linksDialog.visible

    signal linkRequested(string fileId, string pageId)
    signal unlinkRequested(string linkId)

    function openLink(targetFileId, pages) {
        fileId = targetFileId
        pageChoices = pages.slice()
        linkDialog.open()
    }

    function openLinks(links) {
        linkedNotes = links.slice()
        linksDialog.open()
    }

    Dialog {
        id: linkDialog
        title: "Link file to a note"
        modal: true
        standardButtons: Dialog.NoButton
        anchors.centerIn: parent
        width: 380
        background: Rectangle { color: theme.bgDarkCard; border.color: theme.borderCard; radius: 14 }
        contentItem: ComboBox {
            id: pageChoice
            model: linkDialogs.pageChoices
            textRole: "title"
            currentIndex: model.length > 0 ? 0 : -1
            background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 8 }
            contentItem: Text { text: pageChoice.currentText; color: theme.textDark; leftPadding: 10; verticalAlignment: Text.AlignVCenter; elide: Text.ElideRight }
        }
        footer: RowLayout {
            spacing: 8
            Item { Layout.fillWidth: true }
            Button {
                text: "Cancel"
                onClicked: linkDialog.reject()
                background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 8 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                text: "Link"
                enabled: linkDialogs.pageChoices.length > 0 && pageChoice.currentIndex >= 0
                onClicked: linkDialog.accept()
                background: Rectangle { color: parent.enabled ? theme.brand600 : theme.bgDarkSurface; radius: 8 }
                contentItem: Text { text: parent.text; color: "white"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
        onAccepted: {
            var page = linkDialogs.pageChoices[pageChoice.currentIndex]
            if (page) linkDialogs.linkRequested(linkDialogs.fileId, page.id)
        }
    }

    Dialog {
        id: linksDialog
        title: "Linked notes"
        modal: true
        standardButtons: Dialog.Close
        anchors.centerIn: parent
        width: 420
        background: Rectangle { color: theme.bgDarkCard; border.color: theme.borderCard; radius: 14 }
        contentItem: ListView {
            id: linkedNotesList
            model: linkDialogs.linkedNotes
            implicitHeight: Math.min(260, Math.max(80, contentHeight))
            clip: true
            delegate: RowLayout {
                required property var modelData
                width: linkedNotesList.width
                spacing: 8
                AppIcon { width: 16; height: 16; name: "notes"; color: theme.brand400 }
                Text { Layout.fillWidth: true; text: modelData.page_title || "Untitled note"; color: theme.textSubtext; font.pixelSize: 11; elide: Text.ElideRight }
                ToolButton {
                    text: "×"
                    onClicked: linkDialogs.unlinkRequested(modelData.id)
                    background: Rectangle { color: parent.hovered ? theme.errorBg : "transparent"; radius: 6 }
                    contentItem: Text { text: parent.text; color: theme.error; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }
            }
            footer: Label {
                visible: linkDialogs.linkedNotes.length === 0
                width: linkedNotesList.width
                height: visible ? 54 : 0
                text: "No notes are linked to this file."
                color: theme.textMuted
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }
    }
}
