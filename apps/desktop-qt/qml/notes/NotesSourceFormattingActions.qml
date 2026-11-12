pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: sourceActions
    visible: !richMode
    spacing: 4

    property bool richMode: false
    signal formatRequested(string prefix, string suffix)

    Rectangle {
        Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
        Text { anchors.centerIn: parent; text: "H1"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: sourceActions.formatRequested("<h1>", "</h1>") }
    }
    Rectangle {
        Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
        Text { anchors.centerIn: parent; text: "H2"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: sourceActions.formatRequested("<h2>", "</h2>") }
    }
    Rectangle {
        Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
        Accessible.name: qsTr("Heading 3")
        Text { anchors.centerIn: parent; text: "H3"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: sourceActions.formatRequested("<h3>", "</h3>") }
    }
    Repeater {
        model: sourceActions.richMode ? [] : [4, 5, 6]
        delegate: Rectangle {
            required property int modelData
            Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
            Accessible.name: qsTr("Heading %1").arg(modelData)
            Text { anchors.centerIn: parent; text: "H" + parent.modelData; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: sourceActions.formatRequested("<h" + parent.modelData + ">", "</h" + parent.modelData + ">")
            }
        }
    }
    Rectangle {
        Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
        Text { anchors.centerIn: parent; text: "•"; color: "#ffffff"; font.pixelSize: 14 }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: sourceActions.formatRequested("<ul><li>", "</li></ul>") }
    }
    Rectangle {
        Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
        Accessible.name: qsTr("Numbered list")
        Text { anchors.centerIn: parent; text: "1."; color: "#ffffff"; font.pixelSize: 12 }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: sourceActions.formatRequested("<ol><li>", "</li></ol>") }
    }
    Rectangle {
        Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
        Text { anchors.centerIn: parent; text: "”"; color: "#ffffff"; font.pixelSize: 14 }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: sourceActions.formatRequested("<blockquote>", "</blockquote>") }
    }
    Rectangle {
        Layout.preferredWidth: 32; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
        Text { anchors.centerIn: parent; text: "ℹ️"; font.pixelSize: 11 }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: sourceActions.formatRequested("<div class=\"blockquote-toggle\" data-title=\"Nota\" data-color=\"default\" data-is-open=\"true\"><p>", "</p></div>") }
    }
    Rectangle {
        Layout.preferredWidth: 32; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
        Text { anchors.centerIn: parent; text: "⚠️"; font.pixelSize: 11 }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: sourceActions.formatRequested("<div class=\"blockquote-toggle\" data-title=\"Atenção\" data-color=\"#f59e0b\" data-is-open=\"true\"><p>", "</p></div>") }
    }
    Rectangle {
        Layout.preferredWidth: 28; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
        Accessible.name: qsTr("Divider")
        Text { anchors.centerIn: parent; text: "—"; color: "#ffffff"; font.pixelSize: 16 }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: sourceActions.formatRequested("<hr>", "") }
    }
    Rectangle {
        Layout.preferredWidth: 32; Layout.preferredHeight: 26; radius: 4; color: "#08ffffff"
        Text { anchors.centerIn: parent; text: "{ }"; color: "#a78bfa"; font.pixelSize: 11; font.bold: true }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: sourceActions.formatRequested("<pre><code>", "</code></pre>") }
    }
}
