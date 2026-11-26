pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: itemRoot
    required property var itemData
    required property int index
    property bool isFirst: false
    property bool isLast: false

    signal moveRequested(int itemIndex, int delta)
    signal previewRequested(string fileId)
    signal ungroupRequested(string fileId)
    signal removeRequested(string fileId)

    function resolvedId() { return String(itemData.fileId || itemData.id || "") }
    function resolvedName() { return String(itemData.name || itemData.title || qsTr("Documento")) }
    function resolvedType() { return String(itemData.fileType || itemData.file_type || "other") }
    function iconName() {
        var type = resolvedType().toLowerCase()
        if (type === "pdf" || type === "document" || type === "doc") return "file-text"
        if (type.indexOf("image") >= 0 || type === "png" || type === "jpg") return "image"
        if (type.indexOf("video") >= 0 || type === "mp4") return "film"
        if (type.indexOf("audio") >= 0) return "files"
        return "files"
    }

    height: 58
    radius: 10
    color: hoverHandler.hovered ? "#272632" : "#1c1b25"
    border.color: hoverHandler.hovered ? "#33ffffff" : "#16ffffff"
    border.width: 1

    HoverHandler { id: hoverHandler }

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 10
        anchors.rightMargin: 8
        spacing: 8

        Rectangle {
            Layout.preferredWidth: 32
            Layout.preferredHeight: 32
            radius: 8
            color: "#262530"
            border.color: "#14ffffff"
            AppIcon {
                anchors.centerIn: parent
                name: itemRoot.iconName()
                color: "#a78bfa"
                width: 16
                height: 16
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2

            Text {
                Layout.fillWidth: true
                text: itemRoot.resolvedName()
                color: hoverHandler.hovered ? "#ffffff" : "#e4e4e7"
                font.pixelSize: 12
                font.weight: Font.Medium
                elide: Text.ElideRight
            }

            Text {
                Layout.fillWidth: true
                text: itemRoot.resolvedType().toUpperCase() +
                    ((itemRoot.itemData.isLink === true || itemRoot.itemData.isLink === "true") ? "  •  Link" : "")
                color: "#858597"
                font.pixelSize: 9
                font.family: "monospace"
                elide: Text.ElideRight
            }
        }

        ToolButton {
            id: moveUpButton
            enabled: !itemRoot.isFirst
            Accessible.name: qsTr("Mover documento para cima")
            onClicked: itemRoot.moveRequested(itemRoot.index, -1)
            background: Rectangle { radius: 5; color: moveUpButton.hovered ? "#1affffff" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "arrow-up"; color: moveUpButton.enabled ? "#a7a9be" : "#52525b"; width: 13; height: 13 }
        }

        ToolButton {
            id: moveDownButton
            enabled: !itemRoot.isLast
            Accessible.name: qsTr("Mover documento para baixo")
            onClicked: itemRoot.moveRequested(itemRoot.index, 1)
            background: Rectangle { radius: 5; color: moveDownButton.hovered ? "#1affffff" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "arrow-down"; color: moveDownButton.enabled ? "#a7a9be" : "#52525b"; width: 13; height: 13 }
        }

        ToolButton {
            id: previewButton
            Accessible.name: qsTr("Pré-visualizar documento")
            onClicked: itemRoot.previewRequested(itemRoot.resolvedId())
            background: Rectangle { radius: 5; color: previewButton.hovered ? "#228b5cf6" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "eye"; color: "#a7a9be"; width: 14; height: 14 }
        }

        ToolButton {
            id: ungroupButton
            Accessible.name: qsTr("Desagrupar documento nesta página")
            onClicked: itemRoot.ungroupRequested(itemRoot.resolvedId())
            background: Rectangle { radius: 5; color: ungroupButton.hovered ? "#22f59e0b" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "external-link"; color: "#fbbf24"; width: 13; height: 13 }
        }

        ToolButton {
            id: removeButton
            Accessible.name: qsTr("Remover documento do agrupamento")
            onClicked: itemRoot.removeRequested(itemRoot.resolvedId())
            background: Rectangle { radius: 5; color: removeButton.hovered ? "#22ef4444" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#f87171"; width: 13; height: 13 }
        }
    }
}
