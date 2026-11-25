import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: encImgWrap
    Layout.fillWidth: true
    implicitHeight: encCol.implicitHeight + 6

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string imageSrc: attrs["src"] || attrs["data-src"] || ""
    property string driveFileId: attrs["data-drive-file-id"] || ""
    property string caption: attrs["data-caption"] || ""
    property int imageWidth: parseInt(attrs["data-width"] || attrs["width"] || "460", 10) || 460
    property int imageHeight: parseInt(attrs["data-height"] || attrs["height"] || "260", 10) || 260
    readonly property bool isUnlocked: typeof dataController !== "undefined" && dataController
        ? Boolean(dataController.isVaultUnlocked) : false

    signal attrsUpdated(var newAttrs)
    signal removeRequested()

    HoverHandler { id: encHover }

    ColumnLayout {
        id: encCol
        width: Math.min(encImgWrap.imageWidth, parent.width)
        anchors.horizontalCenter: parent.horizontalCenter
        spacing: 6

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: encImgWrap.imageHeight
            radius: 12
            color: "#14131f"
            border.color: encHover.hovered ? "#408b5cf6" : "#22ffffff"
            border.width: 1
            clip: true

            Image {
                anchors.fill: parent
                visible: encImgWrap.isUnlocked && encImgWrap.imageSrc.length > 0
                source: encImgWrap.isUnlocked ? encImgWrap.imageSrc : ""
                fillMode: Image.PreserveAspectFit
                asynchronous: true
            }

            ColumnLayout {
                anchors.centerIn: parent
                visible: !encImgWrap.isUnlocked || encImgWrap.imageSrc.length === 0
                spacing: 8

                Rectangle {
                    Layout.preferredWidth: 44
                    Layout.preferredHeight: 44
                    Layout.alignment: Qt.AlignHCenter
                    radius: 10
                    color: "#281b38"
                    border.color: "#7c3aed"
                    border.width: 1

                    AppIcon {
                        anchors.centerIn: parent
                        name: "vault"
                        color: "#a78bfa"
                        width: 20
                        height: 20
                    }
                }

                Text {
                    text: encImgWrap.isUnlocked ? qsTr("Imagem Criptografada (Cofre)") : qsTr("Imagem Criptografada")
                    color: "#fffffe"
                    font.pixelSize: 13
                    font.weight: Font.DemiBold
                    Layout.alignment: Qt.AlignHCenter
                }

                Text {
                    text: encImgWrap.isUnlocked
                        ? (encImgWrap.driveFileId.length > 0 ? ("ID: " + encImgWrap.driveFileId) : qsTr("Mídia protegida E2EE"))
                        : qsTr("Desbloqueie o cofre para visualizar")
                    color: "#a7a9be"
                    font.pixelSize: 11
                    Layout.alignment: Qt.AlignHCenter
                }
            }

            ToolButton {
                visible: encHover.hovered
                anchors.top: parent.top
                anchors.right: parent.right
                anchors.margins: 8
                width: 24
                height: 24
                focusPolicy: Qt.NoFocus
                onClicked: encImgWrap.removeRequested()
                background: Rectangle { radius: 6; color: parent.hovered ? "#22ef4444" : "#cc0f0e17" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fb7185"; width: 12; height: 12 }
            }
        }

        TextField {
            visible: encImgWrap.caption.length > 0 || encHover.hovered || activeFocus
            Layout.fillWidth: true
            text: encImgWrap.caption
            placeholderText: qsTr("Legenda da imagem...")
            placeholderTextColor: "#52525b"
            color: "#a7a9be"
            font.pixelSize: 12
            horizontalAlignment: Text.AlignHCenter
            background: null
            onEditingFinished: {
                var next = Object.assign({}, encImgWrap.attrs)
                next["data-caption"] = text
                encImgWrap.attrsUpdated(next)
            }
        }
    }
}
