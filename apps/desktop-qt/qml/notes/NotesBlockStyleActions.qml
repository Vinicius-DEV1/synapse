import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

pragma ComponentBehavior: Bound

RowLayout {
    id: actionsRoot
    spacing: 4
    signal blockRequested(string blockType)

    readonly property var styles: [
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
        { label: "{ }", title: qsTr("Code block"), value: "codeBlock" }
    ]

    Repeater {
        model: actionsRoot.styles
        delegate: Rectangle {
            id: styleButton
            required property var modelData
            Layout.preferredWidth: styleButton.modelData.label === "•" ? 22 : 30
            Layout.preferredHeight: 26
            radius: 4
            color: "#08ffffff"
            Accessible.name: styleButton.modelData.title
            ToolTip.visible: styleButtonMouse.containsMouse
            ToolTip.text: styleButton.modelData.title
            Text {
                anchors.centerIn: parent
                text: styleButton.modelData.label
                color: "#ffffff"
                font.pixelSize: styleButton.modelData.label.length > 1 ? 10 : 14
                font.bold: styleButton.modelData.label.startsWith("H")
            }
            MouseArea {
                id: styleButtonMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: actionsRoot.blockRequested(styleButton.modelData.value)
            }
        }
    }
}
