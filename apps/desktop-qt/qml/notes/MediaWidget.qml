import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: mediaWidgetRoot
    implicitWidth: Math.min(parent ? parent.width : 520, contentRow.implicitWidth + 20)
    implicitHeight: 38
    radius: 8

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string mediaType: (attrs["data-media-type"] || attrs["media-type"] || attrs["mediaType"] || "video").toLowerCase()
    property string mediaId: attrs["data-media-id"] || attrs["media-id"] || attrs["mediaId"] || ""
    property string title: attrs["data-title"] || attrs["title"] || qsTr("Mídia vinculada")
    property string accentColor: attrs["data-color"] || attrs["color"] || "default"
    property bool showColorPicker: false

    readonly property bool hasCustomColor: accentColor.length > 0 && accentColor !== "default"

    color: hasCustomColor
        ? (accentColor + "18")
        : (hoverHandler.hovered ? "#338b5cf6" : "#1a8b5cf6")
    border.color: hasCustomColor
        ? (hoverHandler.hovered ? accentColor : (accentColor + "60"))
        : "#338b5cf6"
    border.width: 1
    Behavior on color { ColorAnimation { duration: 150 } }
    Behavior on border.color { ColorAnimation { duration: 150 } }

    signal openMediaRequested(string mediaType, string mediaId, string title)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    MouseArea {
        anchors.fill: parent
        cursorShape: Qt.PointingHandCursor
        onClicked: mediaWidgetRoot.openMediaRequested(mediaWidgetRoot.mediaType, mediaWidgetRoot.mediaId, mediaWidgetRoot.title)
    }

    RowLayout {
        id: contentRow
        anchors.verticalCenter: parent.verticalCenter
        anchors.left: parent.left
        anchors.leftMargin: 10
        spacing: 8

        // Icon badge matching MediaWidgetNodeView.tsx
        Rectangle {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 28
            radius: 7
            color: "#0f0e17"
            border.color: "#0dffffff"
            border.width: 1
            AppIcon {
                anchors.centerIn: parent
                name: mediaWidgetRoot.mediaType === "book" ? "book-open" : "film"
                color: mediaWidgetRoot.mediaType === "book" ? "#60a5fa" : "#c084fc"
                width: 15
                height: 15
            }
        }

        Text {
            text: mediaWidgetRoot.title
            color: hoverHandler.hovered ? "#ffffff" : "#fffffe"
            font.pixelSize: 13
            font.weight: Font.Medium
            elide: Text.ElideRight
            Layout.maximumWidth: 280
        }

        ToolButton {
            visible: hoverHandler.hovered
            Layout.preferredWidth: 22
            Layout.preferredHeight: 22
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Remover mídia da nota")
            onClicked: mediaWidgetRoot.removeRequested()
            background: Rectangle { radius: 5; color: parent.hovered ? "#33000000" : "transparent" }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "close"
                color: parent.hovered ? "#f87171" : "#a7a9be"
                width: 13
                height: 13
            }
        }
    }
}
