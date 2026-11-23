import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: mediaWidgetRoot
    Layout.fillWidth: true
    implicitHeight: 58
    radius: 11
    color: "#161524"
    border.color: hoverHandler.hovered ? "#448b5cf6" : "#18ffffff"
    border.width: 1

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string mediaType: attrs["data-media-type"] || attrs["media-type"] || "video"
    property string mediaId: attrs["data-media-id"] || attrs["media-id"] || ""
    property string title: attrs["data-title"] || attrs["title"] || qsTr("Mídia vinculada")

    signal openMediaRequested(string mediaType, string mediaId, string title)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 12
        spacing: 10

        Rectangle {
            Layout.preferredWidth: 34
            Layout.preferredHeight: 34
            radius: 8
            color: mediaWidgetRoot.mediaType === "book" ? "#223b82f6" : "#228b5cf6"
            AppIcon {
                anchors.centerIn: parent
                name: mediaWidgetRoot.mediaType === "book" ? "library" : "video"
                color: mediaWidgetRoot.mediaType === "book" ? "#60a5fa" : "#c4b5fd"
                width: 17
                height: 17
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2
            Text {
                text: mediaWidgetRoot.title
                color: "#fffffe"
                font.pixelSize: 13
                font.weight: Font.DemiBold
                elide: Text.ElideRight
                Layout.fillWidth: true
            }
            Text {
                text: mediaWidgetRoot.mediaType === "book" ? qsTr("Livro da Biblioteca") : qsTr("Vídeo da Galeria")
                color: "#94a1b2"
                font.pixelSize: 11
            }
        }

        Button {
            Layout.preferredHeight: 28
            padding: 10
            onClicked: mediaWidgetRoot.openMediaRequested(mediaWidgetRoot.mediaType, mediaWidgetRoot.mediaId, mediaWidgetRoot.title)
            background: Rectangle { radius: 6; color: parent.hovered ? "#7c3aed" : "#228b5cf6" }
            contentItem: Text { text: qsTr("Abrir"); color: "#ffffff"; font.pixelSize: 11; font.bold: true }
        }

        ToolButton {
            visible: hoverHandler.hovered
            Layout.preferredWidth: 26
            Layout.preferredHeight: 26
            onClicked: mediaWidgetRoot.removeRequested()
            background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 12; height: 12 }
        }
    }
}
