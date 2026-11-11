pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: toolbarRoot
    objectName: "notesFormattingToolbar"
    Layout.fillWidth: true
    height: 38
    radius: 8
    color: "#161524"
    border.color: "#0fffffff"

    signal formatRequested(string prefix, string suffix)
    signal linkRequested()
    signal richColorRequested(bool background, string color)
    signal richBlockRequested(string blockType)
    signal richTableRequested()
    signal richTableActionRequested(string action)
    signal richCellBackgroundRequested(string color)
    signal richDividerRequested()
    signal richMarkRequested(string mark)
    property bool richMode: false
    property bool tableCellActive: false
    property bool canMoveTableRowUp: false
    property bool canMoveTableRowDown: false
    property bool canMoveTableColumnLeft: false
    property bool canMoveTableColumnRight: false
    property bool canDeleteTableRow: false
    property bool canDeleteTableColumn: false
    property bool richSpoilerActive: false
    readonly property var richBlocks: [
        { label: "P", title: qsTr("Paragraph"), value: "paragraph" },
        { label: "H1", title: qsTr("Heading 1"), value: "heading1" },
        { label: "H2", title: qsTr("Heading 2"), value: "heading2" },
        { label: "H3", title: qsTr("Heading 3"), value: "heading3" },
        { label: "H4", title: qsTr("Heading 4"), value: "heading4" },
        { label: "H5", title: qsTr("Heading 5"), value: "heading5" },
        { label: "H6", title: qsTr("Heading 6"), value: "heading6" },
        { label: "•", title: qsTr("Bulleted list"), value: "bulletList" },
        { label: "1.", title: qsTr("Numbered list"), value: "orderedList" },
        { label: "☐", title: qsTr("Task list"), value: "taskList" },
        { label: "❞", title: qsTr("Quote"), value: "quote" },
        { label: "{ }", title: qsTr("Plain code block"), value: "codeBlock" }
    ]

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 8
        anchors.rightMargin: 8
        spacing: 4

        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            Accessible.name: "Insert link"
            Text { anchors.centerIn: parent; text: "↗"; color: "#c4b5fd"; font.pixelSize: 14 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.linkRequested() }
        }

        NotesRichColorPalette {
            richMode: toolbarRoot.richMode
            Layout.preferredWidth: 30
            Layout.preferredHeight: 30
            onColorSelected: function(background, color) {
                toolbarRoot.richColorRequested(background, color)
            }
        }
        Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 16; color: "#15ffffff" }

        // Bold
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            Text { anchors.centerIn: parent; text: "B"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<strong>", "</strong>") }
        }
        // Italic
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            Text { anchors.centerIn: parent; text: "I"; color: "#ffffff"; font.pixelSize: 12; font.italic: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<em>", "</em>") }
        }
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            Accessible.name: qsTr("Underline")
            Text { anchors.centerIn: parent; text: "U"; color: "#ffffff"; font.pixelSize: 12; font.underline: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<u>", "</u>") }
        }
        // Strikethrough
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            Text { anchors.centerIn: parent; text: "S"; color: "#ffffff"; font.pixelSize: 12; font.strikeout: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<s>", "</s>") }
        }
        // Code
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            Accessible.name: qsTr("Inline code")
            Text { anchors.centerIn: parent; text: "</>"; color: "#c4b5fd"; font.pixelSize: 10 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<code>", "</code>") }
        }

        Rectangle {
            visible: toolbarRoot.richMode
            Layout.preferredWidth: 30
            Layout.preferredHeight: 26
            radius: 4
            color: toolbarRoot.richSpoilerActive ? "#1b8b5cf6" : "#08ffffff"
            Accessible.name: qsTr("Spoiler")
            ToolTip.visible: spoilerButtonMouse.containsMouse
            ToolTip.text: qsTr("Spoiler")
            Text { anchors.centerIn: parent; text: "S"; color: "#c4b5fd"; font.pixelSize: 12; font.bold: true; font.strikeout: true }
            MouseArea {
                id: spoilerButtonMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: toolbarRoot.richMarkRequested("spoiler")
            }
        }

        Rectangle { visible: toolbarRoot.richMode; Layout.preferredWidth: 1; Layout.preferredHeight: 16; color: "#15ffffff" }
        Repeater {
            model: toolbarRoot.richMode ? toolbarRoot.richBlocks : []
            delegate: Rectangle {
                id: blockButton
                required property var modelData
                Layout.preferredWidth: modelData.label === "•" ? 22 : 30
                Layout.preferredHeight: 26
                radius: 4
                color: "#08ffffff"
                Accessible.name: modelData.title
                ToolTip.visible: blockButtonMouse.containsMouse
                ToolTip.text: modelData.title
                Text {
                    anchors.centerIn: parent
                    text: blockButton.modelData.label
                    color: "#ffffff"
                    font.pixelSize: blockButton.modelData.label.length > 1 ? 10 : 14
                    font.bold: blockButton.modelData.label.startsWith("H")
                }
                MouseArea {
                    id: blockButtonMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: toolbarRoot.richBlockRequested(blockButton.modelData.value)
                }
            }
        }

        Rectangle {
            visible: toolbarRoot.richMode
            Layout.preferredWidth: 30
            Layout.preferredHeight: 26
            radius: 4
            color: "#08ffffff"
            Accessible.name: qsTr("Insert 3 by 3 table")
            ToolTip.visible: tableButtonMouse.containsMouse
            ToolTip.text: qsTr("Insert 3 by 3 table")
            Text { anchors.centerIn: parent; text: "▦"; color: "#ffffff"; font.pixelSize: 16 }
            MouseArea {
                id: tableButtonMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: toolbarRoot.richTableRequested()
            }
        }

        Rectangle {
            visible: toolbarRoot.richMode
            Layout.preferredWidth: 30
            Layout.preferredHeight: 26
            radius: 4
            color: "#08ffffff"
            Accessible.name: qsTr("Insert divider")
            ToolTip.visible: dividerButtonMouse.containsMouse
            ToolTip.text: qsTr("Insert divider")
            Text { anchors.centerIn: parent; text: "—"; color: "#ffffff"; font.pixelSize: 16 }
            MouseArea {
                id: dividerButtonMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: toolbarRoot.richDividerRequested()
            }
        }

        NotesTableStructureActions {
            active: toolbarRoot.richMode && toolbarRoot.tableCellActive
            canMoveRowUp: toolbarRoot.canMoveTableRowUp
            canMoveRowDown: toolbarRoot.canMoveTableRowDown
            canMoveColumnLeft: toolbarRoot.canMoveTableColumnLeft
            canMoveColumnRight: toolbarRoot.canMoveTableColumnRight
            canDeleteRow: toolbarRoot.canDeleteTableRow
            canDeleteColumn: toolbarRoot.canDeleteTableColumn
            onActionRequested: function(action) { toolbarRoot.richTableActionRequested(action) }
        }

        NotesTableCellBackgroundPalette {
            active: toolbarRoot.richMode && toolbarRoot.tableCellActive
            Layout.preferredWidth: 30
            Layout.preferredHeight: 30
            onColorSelected: function(color) { toolbarRoot.richCellBackgroundRequested(color) }
        }

        Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 16; color: "#15ffffff" }

        // H1
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Text { anchors.centerIn: parent; text: "H1"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<h1>", "</h1>") }
        }
        // H2
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Text { anchors.centerIn: parent; text: "H2"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<h2>", "</h2>") }
        }
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Accessible.name: qsTr("Heading 3")
            Text { anchors.centerIn: parent; text: "H3"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<h3>", "</h3>") }
        }
        Repeater {
            model: toolbarRoot.richMode ? [] : [4, 5, 6]
            delegate: Rectangle {
                required property int modelData
                Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
                Accessible.name: qsTr("Heading %1").arg(modelData)
                Text { anchors.centerIn: parent; text: "H" + parent.modelData; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: toolbarRoot.formatRequested("<h" + parent.modelData + ">", "</h" + parent.modelData + ">")
                }
            }
        }
        // Bullet List
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Text { anchors.centerIn: parent; text: "•"; color: "#ffffff"; font.pixelSize: 14 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<ul><li>", "</li></ul>") }
        }
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Accessible.name: qsTr("Numbered list")
            Text { anchors.centerIn: parent; text: "1."; color: "#ffffff"; font.pixelSize: 12 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<ol><li>", "</li></ol>") }
        }
        // Blockquote
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Text { anchors.centerIn: parent; text: "”"; color: "#ffffff"; font.pixelSize: 14 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<blockquote>", "</blockquote>") }
        }
        // Callout Note
        Rectangle {
            Layout.preferredWidth: 32; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Text { anchors.centerIn: parent; text: "ℹ️"; font.pixelSize: 11 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<div class=\"blockquote-toggle\" data-title=\"Nota\" data-color=\"default\" data-is-open=\"true\"><p>", "</p></div>") }
        }
        // Callout Warning
        Rectangle {
            Layout.preferredWidth: 32; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Text { anchors.centerIn: parent; text: "⚠️"; font.pixelSize: 11 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<div class=\"blockquote-toggle\" data-title=\"Atenção\" data-color=\"#f59e0b\" data-is-open=\"true\"><p>", "</p></div>") }
        }
        Rectangle {
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Accessible.name: qsTr("Divider")
            Text { anchors.centerIn: parent; text: "—"; color: "#ffffff"; font.pixelSize: 16 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<hr>", "") }
        }
        // Code Block
        Rectangle {
            Layout.preferredWidth: 32; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            visible: !toolbarRoot.richMode
            Text { anchors.centerIn: parent; text: "{ }"; color: "#a78bfa"; font.pixelSize: 11; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<pre><code>", "</code></pre>") }
        }
    }
}
