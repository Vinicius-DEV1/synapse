import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: pageHeader
    property string activeTitle: ""
    property string activeDescription: ""
    property string activeIcon: "📄"
    property string activeDate: ""
    property string activePageId: ""
    property string actionStatus: ""
    property var breadcrumbs: []
    property var childPages: []
    property var pages: []
    property var hierarchyActions: null
    property bool isDirty: false
    property bool saveFailed: false
    property bool isPreviewMode: false
    property bool isRichMode: false
    property bool canUseRichMode: false
    property int wordCount: 0
    property int characterCount: 0
    readonly property bool isEmojiPickerOpen: iconPicker.isOpen

    signal pageSelected(string pageId)
    signal createSubPageRequested()
    signal titleModified(string title)
    signal descriptionModified(string description)
    signal iconModified(string icon)
    signal saveRequested()
    signal deleteRequested()
    signal historyRequested()
    signal helpRequested()
    signal shareRequested()
    signal richModeRequested(bool enabled)
    signal moveRequested(string pageId)
    signal previewToggled(bool preview)
    signal openInNewTabRequested(string pageId)
    signal subPageIconChanged(string pageId, string emoji)

    function setTitleText(value) { noteTitleInput.text = value }
    function setDescriptionText(value) { noteDescriptionInput.text = value }

    RowLayout {
        id: pageTitleRow
        Layout.fillWidth: true
        Layout.preferredHeight: 28
        Layout.bottomMargin: 24
        spacing: 4
        NotesSiblingNavigation {
            pages: pageHeader.pages
            pageId: pageHeader.activePageId
            onPageSelected: function(pageId) { pageHeader.pageSelected(pageId) }
        }
        NotesBreadcrumbs {
            Layout.fillWidth: true
            pages: pageHeader.breadcrumbs
            onPageSelected: function(pageId) { pageHeader.pageSelected(pageId) }
        }
    }

    RowLayout {
        id: titleHeaderGroup
        Layout.fillWidth: true
        Layout.preferredHeight: 64
        Layout.bottomMargin: 8
        spacing: 12
        NotesIconPicker {
            id: iconPicker
            activeIcon: pageHeader.activeIcon
            onIconSelected: function(icon) { pageHeader.iconModified(icon) }
        }
        TextField {
            id: noteTitleInput
            Layout.fillWidth: true
            text: pageHeader.activeTitle
            color: "#fffffe"
            font.pixelSize: 36
            font.bold: true
            leftPadding: 0
            background: null
            selectByMouse: true
            placeholderText: qsTr("Untitled")
            placeholderTextColor: "#80a7a9be"
            onTextChanged: if (text !== pageHeader.activeTitle) pageHeader.titleModified(text)
        }
        NotesEditorHeader {
            id: notesEditorHeader
            Layout.preferredWidth: implicitWidth
            isDirty: pageHeader.isDirty
            saveFailed: pageHeader.saveFailed
            isPreviewMode: pageHeader.isPreviewMode
            isRichMode: pageHeader.isRichMode
            canUseRichMode: pageHeader.canUseRichMode
            actionsVisible: pageTitleHover.hovered || headerGroupHover.hovered || noteTitleInput.activeFocus || notesEditorHeader.activeFocus
            pageDate: pageHeader.activeDate
            wordCount: pageHeader.wordCount
            characterCount: pageHeader.characterCount
            onSaveRequested: pageHeader.saveRequested()
            onDeleteRequested: pageHeader.deleteRequested()
            onHistoryRequested: pageHeader.historyRequested()
            onHelpRequested: pageHeader.helpRequested()
            onShareRequested: pageHeader.shareRequested()
            onRichModeRequested: function(enabled) { pageHeader.richModeRequested(enabled) }
            onMoveRequested: pageHeader.moveRequested(pageHeader.activePageId)
            onPreviewToggled: function(preview) { pageHeader.previewToggled(preview) }
        }
        HoverHandler { id: headerGroupHover }
        HoverHandler { id: pageTitleHover; target: pageTitleRow }
    }

    TextField {
        id: noteDescriptionInput
        Layout.fillWidth: true
        Layout.preferredHeight: 24
        Layout.leftMargin: 56
        Layout.bottomMargin: 32
        leftPadding: 0
        text: pageHeader.activeDescription
        color: "#a7a9be"
        font.pixelSize: 16
        background: null
        selectByMouse: true
        placeholderText: qsTr("Add a description")
        placeholderTextColor: "#4da7a9be"
        onEditingFinished: {
            var nextDescription = text.trim()
            if (nextDescription !== pageHeader.activeDescription) pageHeader.descriptionModified(nextDescription)
        }
    }

    NotesSubPageGrid {
        visible: pageHeader.childPages.length > 0
        pages: pageHeader.childPages
        allPages: pageHeader.pages
        actionStatus: pageHeader.actionStatus
        Layout.fillWidth: true
        onPageSelected: function(pageId) { pageHeader.pageSelected(pageId) }
        onOpenInNewTabRequested: function(pageId) { pageHeader.openInNewTabRequested(pageId) }
        onCreateRequested: pageHeader.createSubPageRequested()
        onReorderRequested: function(orderedPageIds) { pageHeader.hierarchyActions.reorder(orderedPageIds) }
        onMoveRequested: function(pageId, newParentId) { pageHeader.hierarchyActions.move(pageId, newParentId) }
        onMoveToRequested: function(pageId) { pageHeader.moveRequested(pageId) }
        onIconChanged: function(pageId, emoji) { pageHeader.subPageIconChanged(pageId, emoji) }
    }
}
