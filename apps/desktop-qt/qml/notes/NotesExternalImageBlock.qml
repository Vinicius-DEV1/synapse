import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: extImgRoot
    Layout.fillWidth: true
    implicitHeight: cardCol.implicitHeight + 8

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string src: attrs["src"] || ""
    property string caption: attrs["data-caption"] || attrs["alt"] || ""
    property string alignMode: attrs["data-align"] || "center"
    property int imgWidth: parseInt(attrs["width"] || "560", 10) || 560

    signal attrsUpdated(var newAttrs)
    signal removeRequested()

    HoverHandler { id: imgHover }

    function saveAttrs(patch) {
        var next = Object.assign({}, attrs, patch)
        attrsUpdated(next)
    }

    ColumnLayout {
        id: cardCol
        width: Math.min(extImgRoot.imgWidth, parent.width)
        anchors.horizontalCenter: extImgRoot.alignMode === "center" ? parent.horizontalCenter : undefined
        anchors.left: extImgRoot.alignMode === "left" ? parent.left : undefined
        anchors.right: extImgRoot.alignMode === "right" ? parent.right : undefined
        spacing: 6

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: imgView.status === Image.Ready && imgView.implicitWidth > 0
                ? Math.max(120, Math.min(520, width * (imgView.implicitHeight / imgView.implicitWidth)))
                : 220
            radius: 10
            color: "#14131f"
            border.color: imgHover.hovered ? "#408b5cf6" : "#1affffff"
            border.width: 1
            clip: true

            Image {
                id: imgView
                anchors.fill: parent
                source: extImgRoot.src
                fillMode: Image.PreserveAspectFit
                asynchronous: true
            }

            RowLayout {
                visible: imgView.status !== Image.Ready
                anchors.centerIn: parent
                spacing: 8
                AppIcon { name: "image"; color: "#a78bfa"; width: 18; height: 18 }
                Text {
                    text: imgView.status === Image.Loading ? qsTr("Carregando imagem...") : (extImgRoot.src || qsTr("Imagem externa"))
                    color: "#a7a9be"
                    font.pixelSize: 12
                    elide: Text.ElideMiddle
                    Layout.maximumWidth: 320
                }
            }

            Rectangle {
                opacity: imgHover.hovered ? 1 : 0
                visible: opacity > 0
                Behavior on opacity { NumberAnimation { duration: 140 } }
                anchors.top: parent.top
                anchors.right: parent.right
                anchors.margins: 8
                height: 28
                width: actRow.implicitWidth + 10
                radius: 8
                color: "#d90f0e17"
                border.color: "#1affffff"

                RowLayout {
                    id: actRow
                    anchors.centerIn: parent
                    spacing: 3

                    Repeater {
                        model: [
                            { label: "50%", w: 380 },
                            { label: "75%", w: 580 },
                            { label: "100%", w: 860 }
                        ]
                        delegate: ToolButton {
                            required property var modelData
                            Layout.preferredHeight: 22
                            leftPadding: 5
                            rightPadding: 5
                            focusPolicy: Qt.NoFocus
                            onClicked: extImgRoot.saveAttrs({ "width": String(modelData.w) })
                            background: Rectangle {
                                radius: 5
                                color: parent.hovered ? "#268b5cf6" : "transparent"
                            }
                            contentItem: Text {
                                text: parent.modelData.label
                                color: "#e2e8f0"
                                font.pixelSize: 10
                            }
                        }
                    }

                    ToolButton {
                        Layout.preferredWidth: 22
                        Layout.preferredHeight: 22
                        focusPolicy: Qt.NoFocus
                        onClicked: extImgRoot.removeRequested()
                        background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                        contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fb7185"; width: 12; height: 12 }
                    }
                }
            }
        }

        TextField {
            visible: extImgRoot.caption.length > 0 || imgHover.hovered || activeFocus
            Layout.fillWidth: true
            text: extImgRoot.caption
            placeholderText: qsTr("Adicionar legenda...")
            placeholderTextColor: "#52525b"
            color: "#a7a9be"
            font.pixelSize: 12
            horizontalAlignment: Text.AlignHCenter
            background: null
            onEditingFinished: extImgRoot.saveAttrs({ "data-caption": text })
        }
    }
}
