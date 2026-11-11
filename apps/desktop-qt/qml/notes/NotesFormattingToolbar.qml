import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: toolbarRoot
    Layout.fillWidth: true
    height: 38
    radius: 8
    color: "#161524"
    border.color: "#0fffffff"

    signal formatRequested(string prefix, string suffix)
    signal linkRequested()

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 8
        anchors.rightMargin: 8
        spacing: 4

        Rectangle {
            width: 28; height: 26; radius: 4; color: "#08ffffff"
            Accessible.name: "Insert link"
            Text { anchors.centerIn: parent; text: "↗"; color: "#c4b5fd"; font.pixelSize: 14 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.linkRequested() }
        }
        Rectangle { width: 1; height: 16; color: "#15ffffff" }

        // Bold
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#08ffffff"
            Text { anchors.centerIn: parent; text: "B"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<strong>", "</strong>") }
        }
        // Italic
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#08ffffff"
            Text { anchors.centerIn: parent; text: "I"; color: "#ffffff"; font.pixelSize: 12; font.italic: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<em>", "</em>") }
        }
        // Strikethrough
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#08ffffff"
            Text { anchors.centerIn: parent; text: "S"; color: "#ffffff"; font.pixelSize: 12; font.strikeout: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<s>", "</s>") }
        }
        // Code
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#08ffffff"
            Text { anchors.centerIn: parent; text: "</>"; color: "#c4b5fd"; font.pixelSize: 10 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<code>", "</code>") }
        }

        Rectangle { width: 1; height: 16; color: "#15ffffff" }

        // H1
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#08ffffff"
            Text { anchors.centerIn: parent; text: "H1"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<h1>", "</h1>") }
        }
        // H2
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#08ffffff"
            Text { anchors.centerIn: parent; text: "H2"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<h2>", "</h2>") }
        }
        // Bullet List
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#08ffffff"
            Text { anchors.centerIn: parent; text: "•"; color: "#ffffff"; font.pixelSize: 14 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<ul><li>", "</li></ul>") }
        }
        // Blockquote
        Rectangle {
            width: 28; height: 26; radius: 4; color: "#08ffffff"
            Text { anchors.centerIn: parent; text: "”"; color: "#ffffff"; font.pixelSize: 14 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<blockquote>", "</blockquote>") }
        }
        // Callout Note
        Rectangle {
            width: 32; height: 26; radius: 4; color: "#08ffffff"
            Text { anchors.centerIn: parent; text: "ℹ️"; font.pixelSize: 11 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<div class=\"blockquote-toggle\" data-title=\"Nota\" data-color=\"default\" data-is-open=\"true\"><p>", "</p></div>") }
        }
        // Callout Warning
        Rectangle {
            width: 32; height: 26; radius: 4; color: "#08ffffff"
            Text { anchors.centerIn: parent; text: "⚠️"; font.pixelSize: 11 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<div class=\"blockquote-toggle\" data-title=\"Atenção\" data-color=\"#f59e0b\" data-is-open=\"true\"><p>", "</p></div>") }
        }
        // Code Block
        Rectangle {
            width: 32; height: 26; radius: 4; color: "#08ffffff"
            Text { anchors.centerIn: parent; text: "{ }"; color: "#a78bfa"; font.pixelSize: 11; font.bold: true }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: toolbarRoot.formatRequested("<pre><code>", "</code></pre>") }
        }
    }
}
