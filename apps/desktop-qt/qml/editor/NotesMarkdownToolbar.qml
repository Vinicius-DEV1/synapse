import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: toolbarRoot
    Layout.fillWidth: true
    height: 38
    radius: 8
    color: "#161524"
    border.color: "#ffffff0f"

    signal formatRequested(string prefix, string suffix)

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 8
        anchors.rightMargin: 8
        spacing: 4

        // Bold
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#ffffff08"
            Text { anchors.centerIn: parent; text: "B"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("**", "**") }
        }
        // Italic
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#ffffff08"
            Text { anchors.centerIn: parent; text: "I"; color: "#ffffff"; font.pixelSize: 12; font.italic: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("*", "*") }
        }
        // Strikethrough
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#ffffff08"
            Text { anchors.centerIn: parent; text: "S"; color: "#ffffff"; font.pixelSize: 12; font.strikeout: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("~~", "~~") }
        }
        // Code
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#ffffff08"
            Text { anchors.centerIn: parent; text: "</>"; color: "#c4b5fd"; font.pixelSize: 10 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("`", "`") }
        }

        Rectangle { width: 1; height: 16; color: "#ffffff15" }

        // H1
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#ffffff08"
            Text { anchors.centerIn: parent; text: "H1"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("# ", "\n") }
        }
        // H2
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#ffffff08"
            Text { anchors.centerIn: parent; text: "H2"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("## ", "\n") }
        }
        // Bullet List
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#ffffff08"
            Text { anchors.centerIn: parent; text: "•"; color: "#ffffff"; font.pixelSize: 14 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("- ", "\n") }
        }
        // Blockquote
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#ffffff08"
            Text { anchors.centerIn: parent; text: "”"; color: "#ffffff"; font.pixelSize: 14 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("> ", "\n") }
        }
        // Callout Note
        Rectangle {
            width: 32; height: 26; radius: 4; color: "#ffffff08"
            Text { anchors.centerIn: parent; text: "ℹ️"; font.pixelSize: 11 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("> [!NOTE]\n> ", "\n") }
        }
        // Callout Warning
        Rectangle {
            width: 32; height: 26; radius: 4; color: "#ffffff08"
            Text { anchors.centerIn: parent; text: "⚠️"; font.pixelSize: 11 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("> [!WARNING]\n> ", "\n") }
        }
        // Code Block
        Rectangle {
            width: 32; height: 26; radius: 4; color: "#ffffff08"
            Text { anchors.centerIn: parent; text: "{ }"; color: "#a78bfa"; font.pixelSize: 11; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("```\n", "\n```") }
        }
    }
}
