import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: markToolbar
    property bool richMode: false
    property bool boldActive: false
    property bool italicActive: false
    property bool underlineActive: false
    property bool strikeActive: false
    property bool codeActive: false
    property bool spoilerActive: false
    implicitWidth: 168 + (richMode ? 34 : 0)
    implicitHeight: 30

    signal formatRequested(string prefix, string suffix)
    signal richMarkRequested(string mark)

    RowLayout {
        anchors.fill: parent
        spacing: 4

        ToolButton {
            id: boldBtn
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            padding: 2
            checkable: true
            checked: markToolbar.boldActive
            Accessible.name: qsTr("Bold")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Bold (Ctrl+B)")
            background: Rectangle {
                radius: 4
                color: boldBtn.checked ? "#268b5cf6" : (boldBtn.hovered ? "#1affffff" : "#08ffffff")
                border.color: boldBtn.checked ? "#408b5cf6" : (boldBtn.hovered ? "#20ffffff" : "transparent")
            }
            contentItem: Text {
                anchors.centerIn: parent
                text: "B"
                color: boldBtn.checked ? "#c4b5fd" : (boldBtn.hovered ? "#fffffe" : "#a7a9be")
                font.pixelSize: 12
                font.bold: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: {
                if (markToolbar.richMode) markToolbar.richMarkRequested("bold")
                else markToolbar.formatRequested("<strong>", "</strong>")
            }
        }

        ToolButton {
            id: italicBtn
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            padding: 2
            checkable: true
            checked: markToolbar.italicActive
            Accessible.name: qsTr("Italic")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Italic (Ctrl+I)")
            background: Rectangle {
                radius: 4
                color: italicBtn.checked ? "#268b5cf6" : (italicBtn.hovered ? "#1affffff" : "#08ffffff")
                border.color: italicBtn.checked ? "#408b5cf6" : (italicBtn.hovered ? "#20ffffff" : "transparent")
            }
            contentItem: Text {
                anchors.centerIn: parent
                text: "I"
                color: italicBtn.checked ? "#c4b5fd" : (italicBtn.hovered ? "#fffffe" : "#a7a9be")
                font.pixelSize: 12
                font.italic: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: {
                if (markToolbar.richMode) markToolbar.richMarkRequested("italic")
                else markToolbar.formatRequested("<em>", "</em>")
            }
        }

        ToolButton {
            id: underlineBtn
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            padding: 2
            checkable: true
            checked: markToolbar.underlineActive
            Accessible.name: qsTr("Underline")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Underline (Ctrl+U)")
            background: Rectangle {
                radius: 4
                color: underlineBtn.checked ? "#268b5cf6" : (underlineBtn.hovered ? "#1affffff" : "#08ffffff")
                border.color: underlineBtn.checked ? "#408b5cf6" : (underlineBtn.hovered ? "#20ffffff" : "transparent")
            }
            contentItem: Text {
                anchors.centerIn: parent
                text: "U"
                color: underlineBtn.checked ? "#c4b5fd" : (underlineBtn.hovered ? "#fffffe" : "#a7a9be")
                font.pixelSize: 12
                font.underline: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: {
                if (markToolbar.richMode) markToolbar.richMarkRequested("underline")
                else markToolbar.formatRequested("<u>", "</u>")
            }
        }

        ToolButton {
            id: strikeBtn
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            padding: 2
            checkable: true
            checked: markToolbar.strikeActive
            Accessible.name: qsTr("Strikethrough")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Strikethrough")
            background: Rectangle {
                radius: 4
                color: strikeBtn.checked ? "#268b5cf6" : (strikeBtn.hovered ? "#1affffff" : "#08ffffff")
                border.color: strikeBtn.checked ? "#408b5cf6" : (strikeBtn.hovered ? "#20ffffff" : "transparent")
            }
            contentItem: Text {
                anchors.centerIn: parent
                text: "S"
                color: strikeBtn.checked ? "#c4b5fd" : (strikeBtn.hovered ? "#fffffe" : "#a7a9be")
                font.pixelSize: 12
                font.strikeout: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: {
                if (markToolbar.richMode) markToolbar.richMarkRequested("strike")
                else markToolbar.formatRequested("<s>", "</s>")
            }
        }

        ToolButton {
            id: codeBtn
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            padding: 2
            checkable: true
            checked: markToolbar.codeActive
            Accessible.name: qsTr("Inline code")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Inline code")
            background: Rectangle {
                radius: 4
                color: codeBtn.checked ? "#268b5cf6" : (codeBtn.hovered ? "#1affffff" : "#08ffffff")
                border.color: codeBtn.checked ? "#408b5cf6" : (codeBtn.hovered ? "#20ffffff" : "transparent")
            }
            contentItem: Text {
                anchors.centerIn: parent
                text: "</>"
                color: codeBtn.checked ? "#c4b5fd" : (codeBtn.hovered ? "#fffffe" : "#a7a9be")
                font.pixelSize: 10
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: {
                if (markToolbar.richMode) markToolbar.richMarkRequested("code")
                else markToolbar.formatRequested("<code>", "</code>")
            }
        }

        ToolButton {
            id: spoilerBtn
            visible: markToolbar.richMode
            Layout.preferredWidth: 30
            Layout.preferredHeight: 26
            padding: 2
            checkable: true
            checked: markToolbar.spoilerActive
            Accessible.name: qsTr("Spoiler")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Spoiler (Alt+R to toggle)")
            background: Rectangle {
                radius: 4
                color: spoilerBtn.checked ? "#268b5cf6" : (spoilerBtn.hovered ? "#1affffff" : "#08ffffff")
                border.color: spoilerBtn.checked ? "#408b5cf6" : (spoilerBtn.hovered ? "#20ffffff" : "transparent")
            }
            contentItem: Text {
                anchors.centerIn: parent
                text: "S"
                color: spoilerBtn.checked ? "#c4b5fd" : (spoilerBtn.hovered ? "#fffffe" : "#a7a9be")
                font.pixelSize: 12
                font.bold: true
                font.strikeout: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: markToolbar.richMarkRequested("spoiler")
        }
    }
}
