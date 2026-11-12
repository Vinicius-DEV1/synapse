import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: helpRoot
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 720)
    height: Math.min(parent.height - 32, 450)
    modal: true
    title: qsTr("Notes guide")
    visible: isOpen
    property bool isOpen: false
    property int section: 0

    contentItem: RowLayout {
        spacing: 20
        ColumnLayout {
            Layout.preferredWidth: 170
            Layout.fillHeight: true
            Button { Layout.fillWidth: true; text: qsTr("Editing"); highlighted: helpRoot.section === 0; onClicked: helpRoot.section = 0 }
            Button { Layout.fillWidth: true; text: qsTr("Pages"); highlighted: helpRoot.section === 1; onClicked: helpRoot.section = 1 }
            Button { Layout.fillWidth: true; text: qsTr("Shortcuts"); highlighted: helpRoot.section === 2; onClicked: helpRoot.section = 2 }
            Item { Layout.fillHeight: true }
            Button { Layout.fillWidth: true; text: qsTr("Close"); onClicked: helpRoot.close() }
        }
        Text {
            Layout.fillWidth: true
            Layout.fillHeight: true
            color: "#fffffe"
            wrapMode: Text.Wrap
            lineHeight: 1.4
            text: helpRoot.section === 0
                ? qsTr("Open a page and select Edit. Use the mode button beside the guide to switch between source and visual editing. Visual editing supports paragraphs, headings 1–6, plain horizontal dividers, simple uniform tables with a header row, body rows, subtle borders, padded cells, a shaded header, and a table palette for setting or clearing the background on the active cell, current row, current column, or entire table, bulleted and numbered lists with keyboard nesting and outdent, standard quotations, plain code blocks without language metadata, bold, italic, underline, strike, inline code, spoiler marks, text color, highlights, and safe http, https, or mailto links. Click hidden spoiler text to reveal it, Alt+click to toggle it, and double-click to hide it again. For keyboard access, place the caret in spoiler text and press Alt+R; a checkbox appears beside the caret, where Space toggles reveal state and Escape returns to the editor. The checkbox exposes its checked state to assistive technology. Native spoiler visuals remain static. In a list, Tab nests the current item under its preceding sibling and Shift+Tab outdents a nested item; either shortcut moves the whole item and its nested lists from any direct paragraph. Bullet and numbered list items can contain multiple direct paragraphs before and after nested lists. For task lists, click a checkbox, move the caret to its marker and press Space, or Tab to a checkbox when list indentation does not apply; a focused checkbox toggles with Space and exposes all task paragraphs and checked state to assistive technology. Task items can contain multiple direct paragraphs, and checking an item dims and strikes through all of them. Block actions apply to the current block or every block touched by the selection. Select text and open the A palette to choose a text or highlight color. Use the link action to add, edit, or remove a link. Unsupported structures such as merged or resized tables, unsupported cell colors, custom column metadata, malformed task markup, list items with unsupported non-list block children, and language-tagged or syntax-highlighted code blocks stay in source mode so their markup is preserved. Undo unsupported pasted formatting before saving, previewing, or leaving the page. The visual toolbar inserts a horizontal divider, a task list, and a three-by-three table with one header row and two body rows. When the caret is in a table, use the contextual controls to add or delete rows and columns, move adjacent rows and columns, or delete the table. Use the adjacent table palette to set or clear the background on the active cell, current row, current column, or entire table. Arbitrary rectangular multi-cell color selection remains unavailable. Move controls disable at table edges; moving the header row preserves its header styling and saved header-cell semantics. The final row or column cannot be deleted. When the caret is on a divider, use its contextual controls to move it up or down across an adjacent compatible block or add a paragraph below it. Movement disables at document and structural boundaries. Divider drag remains unavailable. In source mode, the formatting toolbar and context menu can insert headings, lists, dividers, and custom tables; edit table cells in the source. Applying the same inline format again removes matching markup. Undo and redo restore each formatting or link insertion as one action. Preview renders supported content. Changes save automatically; use Save to retry if saving fails.")
                : helpRoot.section === 1
                ? qsTr("Create pages and subpages, move them through the page actions, and open History to inspect saved revisions. Moving a page to Trash includes its active descendants.")
                : qsTr("Ctrl/Cmd+S: save\nCtrl/Cmd+E: toggle preview\nCtrl/Cmd+B: toggle bold\nCtrl/Cmd+I: toggle italic\nCtrl/Cmd+U: toggle underline\nCtrl/Cmd+Shift+X: toggle strikeout\nCtrl/Cmd+Shift+S: toggle spoiler\n\nEditor shortcuts are disabled while an editor dialog is open.")
        }
    }
}
