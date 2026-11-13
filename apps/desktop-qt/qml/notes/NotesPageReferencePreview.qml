import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Popup {
    id: previewRoot
    objectName: "notesPageReferencePreview"

    property var controller: null
    property string pageId: ""
    property var pageData: ({})
    property string loadError: ""
    property bool isEditing: false
    property bool isSaving: false
    property string editTitle: ""
    property string editDescription: ""
    property string editContent: ""
    property string statusMessage: ""
    readonly property bool isDirty: isEditing && (
        editTitle !== String(pageData.title || "") ||
        editDescription !== String(pageData.description || "") ||
        editContent !== String(pageData.content || ""))

    signal expandRequested(string pageId)
    signal pageSaved(string pageId, string title)

    modal: true
    focus: true
    closePolicy: isEditing && isDirty ? Popup.NoAutoClose : (Popup.CloseOnEscape | Popup.CloseOnPressOutside)
    parent: Overlay.overlay
    width: Math.max(0, Math.min(928, parent ? parent.width - 48 : 928))
    height: Math.max(320, Math.min(680, parent ? parent.height * 0.85 : 680))
    x: parent ? Math.round((parent.width - width) / 2) : 0
    y: parent ? Math.round((parent.height - height) / 2) : 0

    Keys.onEscapePressed: function(event) {
        if (isEditing) { cancelEditing(); event.accepted = true; }
        else { close(); event.accepted = true; }
    }

    function openForPage(targetPageId) {
        pageId = String(targetPageId || "").trim()
        isEditing = false
        isSaving = false
        statusMessage = ""
        loadPage()
        open()
    }

    function loadPage() {
        pageData = ({})
        loadError = ""
        if (pageId.length === 0 || !controller) {
            loadError = qsTr("This page is unavailable.")
            return false
        }
        try {
            var result = controller.getPage(pageId)
            if (!result || String(result.id || "") !== pageId) {
                loadError = qsTr("This page is unavailable or was moved to Trash.")
                return false
            }
            pageData = result
            editTitle = String(result.title || "")
            editDescription = String(result.description || "")
            editContent = String(result.content || "")
            return true
        } catch (error) {
            console.error("[NotesPageReferencePreview] Failed to load page", pageId, error)
            loadError = qsTr("The page could not be loaded. Close the preview and try again.")
            return false
        }
    }

    function startEditing() {
        if (String(pageData.id || "") !== pageId) return false
        editTitle = String(pageData.title || "")
        editDescription = String(pageData.description || "")
        editContent = String(pageData.content || "")
        statusMessage = ""
        isEditing = true
        return true
    }

    function cancelEditing() {
        editTitle = String(pageData.title || "")
        editDescription = String(pageData.description || "")
        editContent = String(pageData.content || "")
        statusMessage = ""
        isEditing = false
        return true
    }

    function saveEdits() {
        if (!controller || String(pageData.id || "") !== pageId) {
            statusMessage = qsTr("Failed to save changes.")
            return false
        }
        isSaving = true
        var titleToSave = editTitle.trim().length > 0 ? editTitle.trim() : qsTr("Untitled")
        var descToSave = editDescription.trim()
        var contentToSave = editContent
        var expectedUpdated = String(pageData.updated_at || "")
        var iconToSave = String(pageData.icon || "📄")
        var ok = false
        try {
            ok = controller.savePage(pageId, titleToSave, contentToSave, iconToSave, expectedUpdated)
        } catch (e) {
            console.error("[NotesPageReferencePreview] Error saving page", pageId, e)
            ok = false
        }
        if (ok) {
            if (typeof controller.updatePageDescription === "function") {
                try { controller.updatePageDescription(pageId, descToSave) } catch (err) {}
            }
            loadPage()
            isEditing = false
            isSaving = false
            statusMessage = qsTr("Saved")
            pageSaved(pageId, titleToSave)
            return true
        } else {
            isSaving = false
            statusMessage = qsTr("Failed to save changes.")
            return false
        }
    }

    function requestExpand() {
        if (String(pageData.id || "") !== pageId) return false
        expandRequested(pageId)
        return true
    }

    function activateContentLink(link) {
        var href = String(link || "")
        if (/^(https?:\/\/|mailto:)/i.test(href)) { Qt.openUrlExternally(href); return; }
        var match = href.match(/^synapse-page:\/([^?]+)(?:\?.*)?$/)
        if (!match) return
        try { openForPage(decodeURIComponent(match[1])) } catch (error) {}
    }

    background: Rectangle { radius: 14; color: "#0f0e17"; border.color: "#18ffffff" }

    contentItem: ColumnLayout {
        spacing: 0

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 60
            color: "#081a1924"
            border.color: "#0cffffff"
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 20
                anchors.rightMargin: 12
                spacing: 12

                Label {
                    Layout.fillWidth: true
                    text: previewRoot.isEditing ? qsTr("Editing: %1").arg(previewRoot.pageData.title || qsTr("Untitled"))
                                               : (previewRoot.pageData.title || qsTr("Page preview"))
                    color: "#fffffe"; font.pixelSize: 15; font.weight: Font.DemiBold
                    elide: Text.ElideRight; Accessible.name: text
                }

                ToolButton {
                    objectName: "notesPageReferenceEditButton"
                    text: qsTr("Edit"); visible: !previewRoot.isEditing
                    enabled: previewRoot.pageData.id === previewRoot.pageId && previewRoot.loadError.length === 0
                    onClicked: previewRoot.startEditing()
                    ToolTip.visible: hovered; ToolTip.text: qsTr("Edit this page in the preview")
                    Accessible.name: qsTr("Edit page")
                }

                ToolButton {
                    objectName: "notesPageReferenceExpandButton"
                    text: qsTr("Expand"); visible: !previewRoot.isEditing
                    enabled: previewRoot.pageData.id === previewRoot.pageId
                    onClicked: previewRoot.requestExpand()
                    ToolTip.visible: hovered; ToolTip.text: qsTr("Open this page in the main Notes view")
                    Accessible.name: qsTr("Expand page to full view")
                }

                ToolButton {
                    objectName: "notesPageReferenceCancelButton"
                    text: qsTr("Cancel"); visible: previewRoot.isEditing
                    enabled: !previewRoot.isSaving; onClicked: previewRoot.cancelEditing()
                    Accessible.name: qsTr("Cancel editing")
                }

                Button {
                    id: previewSaveButton
                    objectName: "notesPageReferenceSaveButton"
                    text: previewRoot.isSaving ? qsTr("Saving...") : qsTr("Save")
                    visible: previewRoot.isEditing; enabled: !previewRoot.isSaving && previewRoot.isDirty
                    onClicked: previewRoot.saveEdits(); Accessible.name: qsTr("Save page edits")
                    contentItem: Text {
                        text: previewSaveButton.text
                        color: previewSaveButton.enabled ? "#fffffe" : "#71717a"
                        font.pixelSize: 13; font.weight: Font.Medium
                        horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        implicitWidth: 64; implicitHeight: 32; radius: 8
                        color: previewSaveButton.enabled ? (previewSaveButton.down ? "#7c3aed" : (previewSaveButton.hovered ? "#8b5cf6" : "#6d28d9")) : "#1a1924"
                        border.color: previewSaveButton.enabled ? "#9333ea" : "#27272a"
                    }
                }

                ToolButton {
                    id: previewCloseButton
                    objectName: "notesPageReferencePreviewCloseButton"
                    text: "×"; Accessible.name: qsTr("Close page preview")
                    onClicked: previewRoot.close()
                    contentItem: Text {
                        text: previewCloseButton.text
                        color: previewCloseButton.hovered ? "#fffffe" : "#a7a9be"
                        font.pixelSize: 22; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }

        ScrollView {
            Layout.fillWidth: true; Layout.fillHeight: true; clip: true
            contentWidth: availableWidth; ScrollBar.vertical.policy: ScrollBar.AsNeeded

            ColumnLayout {
                width: Math.min(parent.width, 760); anchors.horizontalCenter: parent.horizontalCenter; spacing: 14
                Rectangle { Layout.fillWidth: true; Layout.preferredHeight: 20; color: "transparent" }

                Label {
                    visible: previewRoot.loadError.length > 0; Layout.fillWidth: true
                    text: previewRoot.loadError; color: "#fda4af"; wrapMode: Text.Wrap
                    horizontalAlignment: Text.AlignHCenter
                }

                // View mode header
                RowLayout {
                    visible: previewRoot.loadError.length === 0 && !previewRoot.isEditing
                    Layout.fillWidth: true; spacing: 12
                    Label { text: previewRoot.pageData.icon || "📄"; font.pixelSize: 29; Accessible.name: qsTr("Page icon") }
                    Label {
                        Layout.fillWidth: true; text: previewRoot.pageData.title || qsTr("Untitled")
                        color: "#fffffe"; font.pixelSize: 30; font.weight: Font.Bold; wrapMode: Text.Wrap
                    }
                }

                // View mode description
                Label {
                    visible: previewRoot.loadError.length === 0 && !previewRoot.isEditing && String(previewRoot.pageData.description || "").trim().length > 0
                    Layout.fillWidth: true; text: String(previewRoot.pageData.description || "")
                    color: "#a7a9be"; font.pixelSize: 15; wrapMode: Text.Wrap; leftPadding: 42
                }

                // Edit mode title
                RowLayout {
                    visible: previewRoot.loadError.length === 0 && previewRoot.isEditing
                    Layout.fillWidth: true; spacing: 12
                    Label { text: previewRoot.pageData.icon || "📄"; font.pixelSize: 29; Accessible.name: qsTr("Page icon") }
                    TextField {
                        id: titleInput
                        objectName: "notesPageReferenceTitleInput"
                        Layout.fillWidth: true; text: previewRoot.editTitle; placeholderText: qsTr("Page title")
                        color: "#fffffe"; font.pixelSize: 24; font.bold: true; selectByMouse: true
                        background: Rectangle { color: "#18ffffff"; radius: 8; border.color: titleInput.activeFocus ? "#8b5cf6" : "#28ffffff" }
                        onTextChanged: previewRoot.editTitle = text; Accessible.name: qsTr("Page title")
                    }
                }

                // Edit mode description
                TextField {
                    id: descriptionInput
                    objectName: "notesPageReferenceDescriptionInput"
                    visible: previewRoot.loadError.length === 0 && previewRoot.isEditing
                    Layout.fillWidth: true; Layout.leftMargin: 42; text: previewRoot.editDescription
                    placeholderText: qsTr("Add description..."); color: "#e2e8f0"; font.pixelSize: 14; selectByMouse: true
                    background: Rectangle { color: "#14ffffff"; radius: 8; border.color: descriptionInput.activeFocus ? "#8b5cf6" : "#20ffffff" }
                    onTextChanged: previewRoot.editDescription = text; Accessible.name: qsTr("Page description")
                }

                Rectangle {
                    visible: previewRoot.loadError.length === 0; Layout.fillWidth: true; Layout.preferredHeight: 1; color: "#0cffffff"
                }

                // View mode content
                TextEdit {
                    objectName: "notesPageReferencePreviewContent"
                    visible: previewRoot.loadError.length === 0 && !previewRoot.isEditing
                    Layout.fillWidth: true; Layout.preferredHeight: contentHeight
                    text: String(previewRoot.pageData.content || "").trim().length > 0 ? String(previewRoot.pageData.content) : qsTr("This page is empty.")
                    textFormat: TextEdit.AutoText; color: "#fffffe"; font.pixelSize: 15; wrapMode: TextEdit.Wrap; readOnly: true
                    selectByMouse: true; onLinkActivated: function(link) { previewRoot.activateContentLink(link) }
                }

                // Edit mode content editor
                TextArea {
                    id: contentEditor
                    objectName: "notesPageReferenceContentEditor"
                    visible: previewRoot.loadError.length === 0 && previewRoot.isEditing
                    Layout.fillWidth: true; Layout.minimumHeight: 220; text: previewRoot.editContent
                    placeholderText: qsTr("Page content..."); color: "#fffffe"; font.pixelSize: 15; wrapMode: TextEdit.Wrap; selectByMouse: true
                    background: Rectangle { color: "#10ffffff"; radius: 8; border.color: contentEditor.activeFocus ? "#8b5cf6" : "#20ffffff" }
                    onTextChanged: previewRoot.editContent = text; Accessible.name: qsTr("Page content")
                }

                // Status message feedback
                Label {
                    id: previewStatusLabel
                    objectName: "notesPageReferenceStatusLabel"
                    visible: previewRoot.statusMessage.length > 0; Layout.fillWidth: true; text: previewRoot.statusMessage
                    color: previewRoot.statusMessage.indexOf(qsTr("Failed")) >= 0 ? "#fda4af" : "#a7f3d0"
                    font.pixelSize: 13; Accessible.role: Accessible.StaticText; Accessible.name: text
                }

                Item { Layout.fillWidth: true; Layout.preferredHeight: 28 }
            }
        }
    }
}
