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

    function preserveEditsAfterDescriptionFailure(title, description, content, error) {
        console.error("[NotesPageReferencePreview] Failed to save page description", pageId, error)
        loadPage()
        editTitle = title
        editDescription = description
        editContent = content
        isSaving = false
        statusMessage = qsTr("Failed to save page description. Other fields were saved.")
        pageSaved(pageId, title)
        return false
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
            if (typeof controller.updatePageDescription !== "function") {
                return preserveEditsAfterDescriptionFailure(
                    titleToSave,
                    descToSave,
                    contentToSave,
                    new Error("Controller does not implement updatePageDescription.")
                )
            }
            var descriptionSaved = false
            try {
                descriptionSaved = controller.updatePageDescription(pageId, descToSave)
            } catch (error) {
                return preserveEditsAfterDescriptionFailure(titleToSave, descToSave, contentToSave, error)
            }
            if (!descriptionSaved) {
                return preserveEditsAfterDescriptionFailure(
                    titleToSave,
                    descToSave,
                    contentToSave,
                    new Error("Controller rejected the description update.")
                )
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
        try {
            openForPage(decodeURIComponent(match[1]))
        } catch (error) {
            console.warn("[NotesPageReferencePreview] Ignoring malformed page reference link", href, error)
        }
    }

    background: Rectangle { radius: 14; color: "#0f0e17"; border.color: "#18ffffff" }

    contentItem: ColumnLayout {
        spacing: 0
        focus: true

        Keys.onEscapePressed: function(event) {
            if (previewRoot.isEditing) { previewRoot.cancelEditing(); event.accepted = true; }
            else { previewRoot.close(); event.accepted = true; }
        }

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

        NotesPageReferencePreviewBody {
            Layout.fillWidth: true
            Layout.fillHeight: true
            pageData: previewRoot.pageData
            pageId: previewRoot.pageId
            loadError: previewRoot.loadError
            isEditing: previewRoot.isEditing
            editTitle: previewRoot.editTitle
            editDescription: previewRoot.editDescription
            editContent: previewRoot.editContent
            statusMessage: previewRoot.statusMessage
            onTitleEdited: function(value) { previewRoot.editTitle = value }
            onDescriptionEdited: function(value) { previewRoot.editDescription = value }
            onContentEdited: function(value) { previewRoot.editContent = value }
            onPageReferenceLinkActivated: function(link) { previewRoot.activateContentLink(link) }
        }
    }
}
