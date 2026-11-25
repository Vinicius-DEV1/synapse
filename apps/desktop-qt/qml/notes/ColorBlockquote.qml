import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: blockquoteRoot
    Layout.fillWidth: true
    implicitHeight: quoteCol.implicitHeight + 20
    radius: 6
    color: hasCustomColor ? (accentColor + "15") : "#0dffffff"
    border.width: 0

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string accentColor: attrs["data-color"] || attrs["color"] || "#8b5cf6"
    property string title: attrs["data-title"] || attrs["title"] || ""
    property string content: String(blockData.innerHtml || "")
        .replace(/<[^>]+>/g, "")
        .trim()

    readonly property bool hasCustomColor: accentColor.length > 0 && accentColor !== "default"

    signal askAiRequested(string quoteText)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    // 3px left accent border matching ColorBlockquoteComponent.tsx
    Rectangle {
        anchors.left: parent.left
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        width: 3
        radius: 1.5
        color: blockquoteRoot.hasCustomColor ? blockquoteRoot.accentColor : "#33ffffff"
    }

    ColumnLayout {
        id: quoteCol
        anchors.fill: parent
        anchors.leftMargin: 16
        anchors.rightMargin: 12
        anchors.topMargin: 10
        anchors.bottomMargin: 10
        spacing: 4

        Text {
            visible: blockquoteRoot.title.length > 0
            text: blockquoteRoot.title
            color: blockquoteRoot.hasCustomColor ? blockquoteRoot.accentColor : "#fffffe"
            font.pixelSize: 13
            font.weight: Font.DemiBold
        }

        Text {
            Layout.fillWidth: true
            text: blockquoteRoot.content
            color: "#e2e8f0"
            font.pixelSize: 14
            wrapMode: Text.Wrap
            lineHeight: 1.4
        }
    }
}
