pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesColorUtils.js" as NotesColorUtils
import "../ui"

Rectangle {
    id: mediaWidgetRoot
    implicitWidth: Math.min(parent ? parent.width : 520, contentRow.implicitWidth + 20)
    implicitHeight: 38
    radius: 8

    property var blockData: ({})
    property var controller: null
    property var attrs: blockData.attrs || ({})
    property string mediaType: (attrs["data-media-type"] || attrs["media-type"] || attrs["mediaType"] || "video").toLowerCase()
    property string mediaId: attrs["data-media-id"] || attrs["media-id"] || attrs["mediaId"] || ""
    property string title: attrs["data-title"] || attrs["title"] || qsTr("Mídia vinculada")
    property string accentColor: attrs["data-color"] || attrs["color"] || "default"
    property bool showColorPicker: false

    readonly property bool hasCustomColor: accentColor.length > 0 && accentColor !== "default"

    color: hasCustomColor
        ? NotesColorUtils.withHexAlpha(accentColor, "18")
        : (hoverHandler.hovered ? "#338b5cf6" : "#1a8b5cf6")
    border.color: hasCustomColor
        ? (hoverHandler.hovered ? accentColor : NotesColorUtils.withHexAlpha(accentColor, "60"))
        : "#338b5cf6"
    border.width: 1
    Behavior on color { ColorAnimation { duration: 150 } }
    Behavior on border.color { ColorAnimation { duration: 150 } }

    signal attrsUpdated(var newAttrs)
    signal openMediaRequested(string mediaType, string mediaId, string title)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    MouseArea {
        anchors.fill: parent
        cursorShape: Qt.PointingHandCursor
        onClicked: mediaActionPopup.open()
    }

    Popup {
        id: mediaActionPopup
        y: mediaWidgetRoot.height + 6
        width: 210
        padding: 6
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        background: Rectangle { color: "#f2161522"; radius: 10; border.color: "#338b5cf6" }
        contentItem: ColumnLayout {
            spacing: 2
            Button {
                Layout.fillWidth: true
                Layout.preferredHeight: 30
                onClicked: {
                    mediaActionPopup.close()
                    mediaWidgetRoot.openMediaRequested(mediaWidgetRoot.mediaType, mediaWidgetRoot.mediaId, mediaWidgetRoot.title)
                }
                background: Rectangle { radius: 6; color: hovered ? "#228b5cf6" : "transparent" }
                contentItem: RowLayout {
                    spacing: 8
                    AppIcon { name: "external-link"; color: "#c4b5fd"; width: 13; height: 13 }
                    Text { text: mediaWidgetRoot.mediaType === "book" ? qsTr("Abrir na Biblioteca") : qsTr("Abrir na Galeria"); color: "#fffffe"; font.pixelSize: 12; Layout.fillWidth: true }
                }
            }
            Button {
                Layout.fillWidth: true
                Layout.preferredHeight: 30
                onClicked: {
                    mediaActionPopup.close()
                    mediaWidgetRoot.showColorPicker = !mediaWidgetRoot.showColorPicker
                }
                background: Rectangle { radius: 6; color: hovered ? "#1affffff" : "transparent" }
                contentItem: RowLayout {
                    spacing: 8
                    AppIcon { name: "palette"; color: "#a7a9be"; width: 13; height: 13 }
                    Text { text: qsTr("Alterar cor"); color: "#fffffe"; font.pixelSize: 12; Layout.fillWidth: true }
                }
            }
            Button {
                Layout.fillWidth: true
                Layout.preferredHeight: 30
                onClicked: {
                    mediaActionPopup.close()
                    mediaWidgetRoot.removeRequested()
                }
                background: Rectangle { radius: 6; color: hovered ? "#1aef4444" : "transparent" }
                contentItem: RowLayout {
                    spacing: 8
                    AppIcon { name: "trash"; color: "#f87171"; width: 13; height: 13 }
                    Text { text: qsTr("Remover da nota"); color: "#f87171"; font.pixelSize: 12; Layout.fillWidth: true }
                }
            }
        }
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
            id: paletteBtn
            visible: hoverHandler.hovered || mediaWidgetRoot.showColorPicker
            Layout.preferredWidth: 22
            Layout.preferredHeight: 22
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Cor do cartão")
            onClicked: mediaWidgetRoot.showColorPicker = !mediaWidgetRoot.showColorPicker
            background: Rectangle { radius: 5; color: paletteBtn.hovered ? "#33000000" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "palette"; color: "#a7a9be"; width: 12; height: 12 }
        }

        RowLayout {
            visible: mediaWidgetRoot.showColorPicker
            spacing: 4
            Repeater {
                model: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"]
                delegate: Rectangle {
                    id: swatchDelegate
                    required property string modelData
                    width: 12; height: 12; radius: 6
                    color: swatchDelegate.modelData
                    border.color: mediaWidgetRoot.accentColor === swatchDelegate.modelData ? "#fff" : "#33ffffff"
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            mediaWidgetRoot.accentColor = swatchDelegate.modelData
                            mediaWidgetRoot.showColorPicker = false
                            var next = Object.assign({}, mediaWidgetRoot.attrs)
                            next["data-color"] = swatchDelegate.modelData
                            mediaWidgetRoot.attrsUpdated(next)
                        }
                    }
                }
            }
        }

        ToolButton {
            id: removeBtn
            visible: hoverHandler.hovered
            Layout.preferredWidth: 22
            Layout.preferredHeight: 22
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Remover mídia da nota")
            onClicked: mediaWidgetRoot.removeRequested()
            background: Rectangle { radius: 5; color: removeBtn.hovered ? "#33000000" : "transparent" }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "close"
                color: removeBtn.hovered ? "#f87171" : "#a7a9be"
                width: 13
                height: 13
            }
        }
    }
}
