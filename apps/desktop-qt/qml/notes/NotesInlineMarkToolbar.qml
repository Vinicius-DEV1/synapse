import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: markToolbar
    property bool richMode: false
    property bool spoilerActive: false
    implicitWidth: 156 + (richMode ? 34 : 0)
    implicitHeight: 30

    signal formatRequested(string prefix, string suffix)
    signal richMarkRequested(string mark)

    RowLayout {
        anchors.fill: parent
        spacing: 4

        Rectangle {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            radius: 4
            color: "#08ffffff"
            Accessible.name: qsTr("Bold")
            Text { anchors.centerIn: parent; text: "B"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: markToolbar.formatRequested("<strong>", "</strong>")
            }
        }
        Rectangle {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            radius: 4
            color: "#08ffffff"
            Accessible.name: qsTr("Italic")
            Text { anchors.centerIn: parent; text: "I"; color: "#ffffff"; font.pixelSize: 12; font.italic: true }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: markToolbar.formatRequested("<em>", "</em>")
            }
        }
        Rectangle {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            radius: 4
            color: "#08ffffff"
            Accessible.name: qsTr("Underline")
            Text { anchors.centerIn: parent; text: "U"; color: "#ffffff"; font.pixelSize: 12; font.underline: true }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: markToolbar.formatRequested("<u>", "</u>")
            }
        }
        Rectangle {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            radius: 4
            color: "#08ffffff"
            Accessible.name: qsTr("Strikethrough")
            Text { anchors.centerIn: parent; text: "S"; color: "#ffffff"; font.pixelSize: 12; font.strikeout: true }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: markToolbar.formatRequested("<s>", "</s>")
            }
        }
        Rectangle {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            radius: 4
            color: "#08ffffff"
            Accessible.name: qsTr("Inline code")
            Text { anchors.centerIn: parent; text: "</>"; color: "#c4b5fd"; font.pixelSize: 10 }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: markToolbar.formatRequested("<code>", "</code>")
            }
        }
        Rectangle {
            visible: markToolbar.richMode
            Layout.preferredWidth: 30
            Layout.preferredHeight: 26
            radius: 4
            color: markToolbar.spoilerActive ? "#1b8b5cf6" : "#08ffffff"
            Accessible.name: qsTr("Spoiler")
            ToolTip.visible: spoilerMouse.containsMouse
            ToolTip.text: qsTr("Spoiler")
            Text {
                anchors.centerIn: parent
                text: "S"
                color: "#c4b5fd"
                font.pixelSize: 12
                font.bold: true
                font.strikeout: true
            }
            MouseArea {
                id: spoilerMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: markToolbar.richMarkRequested("spoiler")
            }
        }
    }
}
