import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"
import "../notes"
import "../notes/components"

// Page header mirroring apps/web-react/src/components/page-view/PageHeader.tsx
ColumnLayout {
    id: pageHeader
    property var controller: null
    property string activeTitle: ""
    property string activeDescription: ""
    property string activeIcon: "📄"
    property string activeDate: ""
    property string activePageId: ""
    property bool hasCover: false
    property string actionStatus: ""
    property var breadcrumbs: []
    property var childPages: []
    property var pages: []
    property var hierarchyActions: null
    property bool isDirty: false
    property bool saveFailed: false
    property int wordCount: 0
    property int characterCount: 0
    property bool isSyncingInputs: false
    readonly property bool isEmojiPickerOpen: iconPopup.visible

    signal pageSelected(string pageId)
    signal createSubPageRequested()
    signal titleModified(string title)
    signal descriptionModified(string description)
    signal iconModified(string icon)
    signal saveRequested()
    signal deleteRequested()
    signal duplicateRequested()
    signal exportRequested()
    signal historyRequested()
    signal helpRequested()
    signal shareRequested()
    signal moveRequested(string pageId)
    signal openInNewTabRequested(string pageId)
    signal subPageIconChanged(string pageId, string emoji)
    signal subPageRenameRequested(string pageId, string currentTitle)
    signal subPageCreateRequested(string parentId)
    signal subPageDeleteRequested(string pageId)

    Theme { id: theme }

    function setTitleText(value) {
        var next = String(value || "")
        if (noteTitleInput.text === next) return
        isSyncingInputs = true
        noteTitleInput.text = next
        isSyncingInputs = false
    }

    function setDescriptionText(value) {
        var next = String(value || "")
        if (noteDescriptionInput.text === next) return
        isSyncingInputs = true
        noteDescriptionInput.text = next
        isSyncingInputs = false
    }

    function commitPendingMetadata() {
        var nextDescription = noteDescriptionInput.text.trim()
        if (nextDescription !== pageHeader.activeDescription) {
            pageHeader.descriptionModified(nextDescription)
        }
    }

    Component.onCompleted: {
        setTitleText(activeTitle)
        setDescriptionText(activeDescription)
    }
    onActivePageIdChanged: {
        setTitleText(activeTitle)
        setDescriptionText(activeDescription)
    }
    onActiveTitleChanged: if (!noteTitleInput.activeFocus) setTitleText(activeTitle)
    onActiveDescriptionChanged: if (!noteDescriptionInput.activeFocus) setDescriptionText(activeDescription)

    // Breadcrumb & sibling bar + hover-only action buttons
    RowLayout {
        id: topNavRow
        Layout.fillWidth: true
        Layout.preferredHeight: 30
        Layout.bottomMargin: pageHeader.hasCover ? 14 : 20
        spacing: 6

        NotesSiblingNavigation {
            pages: pageHeader.pages
            pageId: pageHeader.activePageId
            onPageSelected: function(pageId) { pageHeader.pageSelected(pageId) }
        }

        NotesBreadcrumbs {
            Layout.fillWidth: true
            pages: pageHeader.breadcrumbs
            onPageSelected: function(pageId) { pageHeader.pageSelected(pageId) }
            onOpenInNewTabRequested: function(pageId) { pageHeader.openInNewTabRequested(pageId) }
        }

        Item { Layout.fillWidth: true; visible: pageHeader.breadcrumbs.length <= 1 }

        // Subtle save status & word count pill (mirrors subtle React indicator, zero prominent Save clutter)
        readonly property int readingTimeMinutes: Math.max(1, Math.ceil(pageHeader.wordCount / 200))
        Rectangle {
            Layout.preferredHeight: 24
            Layout.preferredWidth: statusLbl.implicitWidth + 16
            radius: 7
            visible: pageHeader.isDirty || pageHeader.saveFailed || topHover.hovered || headerGroupHover.hovered
            color: pageHeader.saveFailed ? theme.errorBg : (pageHeader.isDirty ? "#1a8b5cf6" : theme.bgHover)
            border.color: pageHeader.saveFailed ? theme.errorBorder : theme.borderSubtle
            Text {
                id: statusLbl
                anchors.centerIn: parent
                text: pageHeader.saveFailed ? qsTr("Erro ao salvar")
                    : pageHeader.isDirty ? qsTr("Salvando…")
                    : qsTr("%1 palavras · %2 min").arg(pageHeader.wordCount).arg(topNavRow.readingTimeMinutes)
                color: pageHeader.saveFailed ? "#fda4af" : (pageHeader.isDirty ? theme.brand300 : theme.textMuted)
                font.pixelSize: 11
            }
            MouseArea {
                anchors.fill: parent
                cursorShape: pageHeader.saveFailed ? Qt.PointingHandCursor : Qt.ArrowCursor
                onClicked: if (pageHeader.saveFailed || pageHeader.isDirty) pageHeader.saveRequested()
            }
        }

        RowLayout {
            spacing: 2
            opacity: (topHover.hovered || headerGroupHover.hovered || moreMenu.visible) ? 1.0 : 0.0
            Behavior on opacity { NumberAnimation { duration: 150 } }

            Repeater {
                model: [
                    { key: "share", icon: "share", label: qsTr("Compartilhar"), tip: qsTr("Compartilhar página") },
                    { key: "move", icon: "file-symlink", label: qsTr("Mover"), tip: qsTr("Mover página…") },
                    { key: "history", icon: "clock", label: qsTr("Histórico"), tip: qsTr("Histórico de edições") }
                ]
                delegate: Rectangle {
                    id: actionBtnDelegate
                    required property var modelData
                    Layout.preferredHeight: 28
                    Layout.preferredWidth: btnRow.implicitWidth + 14
                    radius: 8
                    color: btnMouse.containsMouse ? theme.activePillBg : "transparent"
                    ToolTip.visible: btnMouse.containsMouse
                    ToolTip.text: actionBtnDelegate.modelData.tip
                    RowLayout {
                        id: btnRow
                        anchors.centerIn: parent
                        spacing: 5
                        AppIcon { name: actionBtnDelegate.modelData.icon; color: btnMouse.containsMouse ? theme.brand300 : theme.textSubtext; Layout.preferredWidth: 14; Layout.preferredHeight: 14 }
                        Text { text: actionBtnDelegate.modelData.label; color: btnMouse.containsMouse ? theme.brand300 : theme.textSubtext; font.pixelSize: 12; font.weight: Font.Medium }
                    }
                    MouseArea {
                        id: btnMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (actionBtnDelegate.modelData.key === "share") pageHeader.shareRequested()
                            else if (actionBtnDelegate.modelData.key === "move") pageHeader.moveRequested(pageHeader.activePageId)
                            else if (actionBtnDelegate.modelData.key === "history") pageHeader.historyRequested()
                        }
                    }
                }
            }

            ToolButton {
                id: moreOptionsBtn
                Layout.preferredWidth: 28
                Layout.preferredHeight: 28
                focusPolicy: Qt.NoFocus
                Accessible.name: qsTr("Mais opções")
                onClicked: moreMenu.open()
                background: Rectangle { color: moreOptionsBtn.hovered ? "#1affffff" : "transparent"; radius: 7 }
                contentItem: AppIcon { anchors.centerIn: parent; name: "more-horizontal"; color: theme.textSubtext; width: 15; height: 15 }
                Menu {
                    id: moreMenu
                    background: Rectangle { color: theme.bgDarkCard; radius: 10; border.color: theme.borderCard }
                    MenuItem { text: qsTr("Duplicar página"); onTriggered: pageHeader.duplicateRequested() }
                    MenuItem { text: qsTr("Exportar página"); onTriggered: pageHeader.exportRequested() }
                    MenuItem { text: qsTr("Guia do Caderno"); onTriggered: pageHeader.helpRequested() }
                    MenuSeparator {}
                    MenuItem { text: qsTr("Mover para Lixeira"); onTriggered: pageHeader.deleteRequested() }
                }
            }
        }
        HoverHandler { id: topHover }
    }

    // Large Emoji Icon + Multi-line Wrapping Title (negative overlap onto cover bottom when present)
    RowLayout {
        id: titleHeaderGroup
        Layout.fillWidth: true
        Layout.topMargin: pageHeader.hasCover ? -38 : 0
        Layout.bottomMargin: 6
        spacing: 14

        Rectangle {
            id: emojiButton
            Layout.preferredWidth: 64
            Layout.preferredHeight: 64
            Layout.alignment: Qt.AlignTop
            radius: 14
            color: iconPopup.visible ? theme.activePillBg : (emojiMouse.containsMouse ? "#1affffff" : (pageHeader.hasCover ? "#990f0e17" : "transparent"))
            border.color: iconPopup.visible ? theme.borderBrand : (emojiMouse.containsMouse || pageHeader.hasCover ? theme.borderCard : "transparent")
            border.width: 1

            Text {
                anchors.centerIn: parent
                text: pageHeader.activeIcon
                font.pixelSize: 44
            }
            MouseArea {
                id: emojiMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: iconPopup.visible ? iconPopup.close() : iconPopup.open()
            }
            AppEmojiPopover {
                id: iconPopup
                x: 0
                y: emojiButton.height + 8
                onEmojiSelected: function(emoji) { pageHeader.iconModified(emoji) }
            }
        }

        TextArea {
            id: noteTitleInput
            Layout.fillWidth: true
            color: theme.textDark
            font.pixelSize: 36
            font.bold: true
            wrapMode: TextEdit.Wrap
            leftPadding: 0
            rightPadding: 0
            topPadding: 6
            bottomPadding: 4
            background: null
            selectByMouse: true
            placeholderText: qsTr("Sem título")
            placeholderTextColor: "#66a7a9be"
            Keys.onPressed: function(event) {
                if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
                    event.accepted = true
                    noteDescriptionInput.forceActiveFocus()
                }
            }
            onTextChanged: {
                if (pageHeader.isSyncingInputs) return
                var clean = text.replace(/[\r\n]+/g, " ")
                if (clean !== text) { text = clean; return }
                if (text !== pageHeader.activeTitle) pageHeader.titleModified(text)
            }
        }
        HoverHandler { id: headerGroupHover }
    }

    // Wrapping Page Description
    TextArea {
        id: noteDescriptionInput
        Layout.fillWidth: true
        Layout.leftMargin: 78
        Layout.bottomMargin: 24
        leftPadding: 0
        topPadding: 2
        bottomPadding: 4
        color: theme.textSubtext
        font.pixelSize: 15
        wrapMode: TextEdit.Wrap
        background: null
        selectByMouse: true
        placeholderText: qsTr("Adicione uma descrição...")
        placeholderTextColor: "#4da7a9be"
        Keys.onPressed: function(event) {
            if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
                event.accepted = true
                if (nextItemInFocusChain()) nextItemInFocusChain().forceActiveFocus()
            }
        }
        onActiveFocusChanged: {
            if (!activeFocus) {
                var nextDescription = text.trim()
                if (nextDescription !== pageHeader.activeDescription) pageHeader.descriptionModified(nextDescription)
            }
        }
    }

    SubPageGrid {
        visible: true
        pages: pageHeader.childPages
        allPages: pageHeader.pages
        actionStatus: pageHeader.actionStatus
        Layout.fillWidth: true
        Layout.bottomMargin: 12
        onPageSelected: function(pageId) { pageHeader.pageSelected(pageId) }
        onOpenInNewTabRequested: function(pageId) { pageHeader.openInNewTabRequested(pageId) }
        onCreateRequested: pageHeader.createSubPageRequested()
        onReorderRequested: function(orderedPageIds) { pageHeader.hierarchyActions.reorder(orderedPageIds) }
        onMoveRequested: function(pageId, newParentId) { pageHeader.hierarchyActions.move(pageId, newParentId) }
        onMoveToRequested: function(pageId) { pageHeader.moveRequested(pageId) }
        onIconChanged: function(pageId, emoji) { pageHeader.subPageIconChanged(pageId, emoji) }
        onRenameRequested: function(pageId, currentTitle) { pageHeader.subPageRenameRequested(pageId, currentTitle) }
        onCreateSubRequested: function(parentId) { pageHeader.subPageCreateRequested(parentId) }
        onDeleteRequested: function(pageId) { pageHeader.subPageDeleteRequested(pageId) }
    }
}
