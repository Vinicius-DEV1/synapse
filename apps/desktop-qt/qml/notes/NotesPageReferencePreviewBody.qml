import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ScrollView {
    id: bodyRoot

    property var pageData: ({})
    property string pageId: ""
    property string loadError: ""
    property bool isEditing: false
    property string editTitle: ""
    property string editDescription: ""
    property string editContent: ""
    property string statusMessage: ""

    signal titleEdited(string value)
    signal descriptionEdited(string value)
    signal contentEdited(string value)
    signal pageReferenceLinkActivated(string link)

    Layout.fillWidth: true; Layout.fillHeight: true; clip: true
    contentWidth: availableWidth; ScrollBar.vertical.policy: ScrollBar.AsNeeded

    ColumnLayout {
        width: Math.min(parent.width, 760); anchors.horizontalCenter: parent.horizontalCenter; spacing: 14
        Rectangle { Layout.fillWidth: true; Layout.preferredHeight: 20; color: "transparent" }

        Label {
            visible: bodyRoot.loadError.length > 0; Layout.fillWidth: true
            text: bodyRoot.loadError; color: "#fda4af"; wrapMode: Text.Wrap
            horizontalAlignment: Text.AlignHCenter
        }

        // View mode header
        RowLayout {
            visible: bodyRoot.loadError.length === 0 && !bodyRoot.isEditing
            Layout.fillWidth: true; spacing: 12
            Label { text: bodyRoot.pageData.icon || "📄"; font.pixelSize: 29; Accessible.name: qsTr("Page icon") }
            Label {
                Layout.fillWidth: true; text: bodyRoot.pageData.title || qsTr("Untitled")
                color: "#fffffe"; font.pixelSize: 30; font.weight: Font.Bold; wrapMode: Text.Wrap
            }
        }

        // View mode description
        Label {
            visible: bodyRoot.loadError.length === 0 && !bodyRoot.isEditing && String(bodyRoot.pageData.description || "").trim().length > 0
            Layout.fillWidth: true; text: String(bodyRoot.pageData.description || "")
            color: "#a7a9be"; font.pixelSize: 15; wrapMode: Text.Wrap; leftPadding: 42
        }

        // Edit mode title
        RowLayout {
            visible: bodyRoot.loadError.length === 0 && bodyRoot.isEditing
            Layout.fillWidth: true; spacing: 12
            Label { text: bodyRoot.pageData.icon || "📄"; font.pixelSize: 29; Accessible.name: qsTr("Page icon") }
            TextField {
                id: titleInput
                objectName: "notesPageReferenceTitleInput"
                Layout.fillWidth: true; text: bodyRoot.editTitle; placeholderText: qsTr("Page title")
                color: "#fffffe"; font.pixelSize: 24; font.bold: true; selectByMouse: true
                background: Rectangle { color: "#18ffffff"; radius: 8; border.color: titleInput.activeFocus ? "#8b5cf6" : "#28ffffff" }
                onTextChanged: bodyRoot.titleEdited(text); Accessible.name: qsTr("Page title")
            }
        }

        // Edit mode description
        TextField {
            id: descriptionInput
            objectName: "notesPageReferenceDescriptionInput"
            visible: bodyRoot.loadError.length === 0 && bodyRoot.isEditing
            Layout.fillWidth: true; Layout.leftMargin: 42; text: bodyRoot.editDescription
            placeholderText: qsTr("Add description..."); color: "#e2e8f0"; font.pixelSize: 14; selectByMouse: true
            background: Rectangle { color: "#14ffffff"; radius: 8; border.color: descriptionInput.activeFocus ? "#8b5cf6" : "#20ffffff" }
            onTextChanged: bodyRoot.descriptionEdited(text); Accessible.name: qsTr("Page description")
        }

        Rectangle {
            visible: bodyRoot.loadError.length === 0; Layout.fillWidth: true; Layout.preferredHeight: 1; color: "#0cffffff"
        }

        // View mode content
        TextEdit {
            objectName: "notesPageReferencePreviewContent"
            visible: bodyRoot.loadError.length === 0 && !bodyRoot.isEditing
            Layout.fillWidth: true; Layout.preferredHeight: contentHeight
            text: String(bodyRoot.pageData.content || "").trim().length > 0 ? String(bodyRoot.pageData.content) : qsTr("This page is empty.")
            textFormat: TextEdit.AutoText; color: "#fffffe"; font.pixelSize: 15; wrapMode: TextEdit.Wrap; readOnly: true
            selectByMouse: true; onLinkActivated: function(link) { bodyRoot.pageReferenceLinkActivated(link) }
        }

        // Edit mode content editor
        TextArea {
            id: contentEditor
            objectName: "notesPageReferenceContentEditor"
            visible: bodyRoot.loadError.length === 0 && bodyRoot.isEditing
            Layout.fillWidth: true; Layout.minimumHeight: 220; text: bodyRoot.editContent
            placeholderText: qsTr("Page content..."); color: "#fffffe"; font.pixelSize: 15; wrapMode: TextEdit.Wrap; selectByMouse: true
            background: Rectangle { color: "#10ffffff"; radius: 8; border.color: contentEditor.activeFocus ? "#8b5cf6" : "#20ffffff" }
            onTextChanged: bodyRoot.contentEdited(text); Accessible.name: qsTr("Page content")
        }

        // Status message feedback
        Label {
            id: previewStatusLabel
            objectName: "notesPageReferenceStatusLabel"
            visible: bodyRoot.statusMessage.length > 0; Layout.fillWidth: true; text: bodyRoot.statusMessage
            color: bodyRoot.statusMessage.indexOf(qsTr("Failed")) >= 0 ? "#fda4af" : "#a7f3d0"
            font.pixelSize: 13; Accessible.role: Accessible.StaticText; Accessible.name: text
        }

        Item { Layout.fillWidth: true; Layout.preferredHeight: 28 }
    }
}
