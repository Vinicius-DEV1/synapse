pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: looseItemRoot
    required property var itemData

    signal absorbRequested(var sourceBlockPath, string fileId)

    function iconName() {
        var type = String(looseItemRoot.itemData.fileType || "").toLowerCase()
        if (type === "pdf" || type === "document" || type === "doc") return "file-text"
        if (type.indexOf("image") >= 0 || type === "png" || type === "jpg") return "image"
        if (type.indexOf("video") >= 0 || type === "mp4") return "film"
        return "files"
    }

    height: 48
    radius: 8
    color: absorbButton.hovered ? "#1d192a" : "#12111a"
    border.color: absorbButton.hovered ? "#338b5cf6" : "#12ffffff"

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 10
        anchors.rightMargin: 8
        spacing: 8

        AppIcon {
            name: looseItemRoot.iconName()
            color: "#a78bfa"
            Layout.preferredWidth: 15
            Layout.preferredHeight: 15
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 1

            Text {
                Layout.fillWidth: true
                text: String(looseItemRoot.itemData.name || qsTr("Documento"))
                color: "#e4e4e7"
                font.pixelSize: 11
                elide: Text.ElideRight
            }

            Text {
                Layout.fillWidth: true
                text: String(looseItemRoot.itemData.fileType || "other").toUpperCase() +
                    ((looseItemRoot.itemData.isLink === true) ? "  •  Link" : "")
                color: "#71717a"
                font.pixelSize: 9
                font.family: "monospace"
                elide: Text.ElideRight
            }
        }

        Button {
            id: absorbButton
            text: qsTr("Mover para o grupo")
            Accessible.name: qsTr("Mover %1 para o agrupamento").arg(looseItemRoot.itemData.name || qsTr("documento"))
            onClicked: looseItemRoot.absorbRequested(
                           looseItemRoot.itemData.sourceBlockPath,
                           String(looseItemRoot.itemData.fileId || ""))
            background: Rectangle {
                radius: 6
                color: absorbButton.hovered ? "#332d1e55" : "#221b1b2d"
                border.color: absorbButton.hovered ? "#558b5cf6" : "#338b5cf6"
            }
            contentItem: Text {
                text: absorbButton.text
                color: "#c4b5fd"
                font.pixelSize: 9
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }
    }
}
