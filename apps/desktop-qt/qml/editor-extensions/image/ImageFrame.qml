import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../../ui"

// Interactive ImageFrame mirroring apps/web-react/src/components/editor-extensions/image/ImageFrame.tsx
Item {
    id: frameRoot
    Layout.fillWidth: true
    implicitHeight: frameCol.implicitHeight + 8

    property string src: ""
    property string caption: ""
    property string alignMode: "center" // "left" | "center" | "right"
    property int imgWidth: 560
    property bool showEncryptedBadge: false
    property bool isLocked: false
    property string lockedHint: qsTr("Imagem protegida E2EE — desbloqueie o cofre")

    property bool resizing: false
    property int previewWidth: imgWidth

    signal alignChanged(string nextAlign)
    signal widthCommitted(int nextWidth)
    signal captionCommitted(string nextCaption)
    signal viewerRequested()
    signal copyRequested()
    signal deleteRequested()

    HoverHandler { id: hoverHandler }

    ColumnLayout {
        id: frameCol
        width: Math.max(120, Math.min(frameRoot.resizing ? frameRoot.previewWidth : frameRoot.imgWidth, parent.width))
        anchors.horizontalCenter: frameRoot.alignMode === "center" ? parent.horizontalCenter : undefined
        anchors.left: frameRoot.alignMode === "left" ? parent.left : undefined
        anchors.right: frameRoot.alignMode === "right" ? parent.right : undefined
        spacing: 6

        Rectangle {
            id: imageCard
            Layout.fillWidth: true
            Layout.preferredHeight: !frameRoot.isLocked && imgView.status === Image.Ready && imgView.implicitWidth > 0
                ? Math.max(120, Math.min(560, width * (imgView.implicitHeight / imgView.implicitWidth)))
                : 220
            radius: 10
            color: "#14131f"
            border.color: frameRoot.resizing ? "#8b5cf6" : (hoverHandler.hovered ? "#4d8b5cf6" : "#1affffff")
            border.width: frameRoot.resizing ? 2 : 1
            clip: true

            Image {
                id: imgView
                anchors.fill: parent
                visible: !frameRoot.isLocked && frameRoot.src.length > 0 && status !== Image.Error
                source: frameRoot.isLocked ? "" : frameRoot.src
                fillMode: Image.PreserveAspectFit
                asynchronous: true
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onDoubleClicked: frameRoot.viewerRequested()
                }
            }

            // Locked / 403 Error / Loading fallback state
            ColumnLayout {
                visible: frameRoot.isLocked || frameRoot.src.length === 0 || imgView.status !== Image.Ready
                anchors.centerIn: parent
                spacing: 8
                width: Math.min(parent.width - 32, 340)

                Rectangle {
                    Layout.preferredWidth: 42; Layout.preferredHeight: 42; Layout.alignment: Qt.AlignHCenter
                    radius: 10; color: "#281b38"; border.color: "#7c3aed"
                    AppIcon { anchors.centerIn: parent; name: frameRoot.isLocked ? "vault" : "image"; color: "#a78bfa"; width: 18; height: 18 }
                }

                Text {
                    Layout.fillWidth: true; horizontalAlignment: Text.AlignHCenter; wrapMode: Text.WordWrap
                    text: frameRoot.isLocked ? frameRoot.lockedHint
                        : (imgView.status === Image.Error ? qsTr("Falha ao carregar imagem externa (403/Offline)")
                        : (imgView.status === Image.Loading ? qsTr("Carregando imagem...") : qsTr("Sem fonte de imagem")))
                    color: imgView.status === Image.Error ? "#fda4af" : "#a7a9be"; font.pixelSize: 11
                }

                Button {
                    visible: !frameRoot.isLocked && imgView.status === Image.Error && frameRoot.src.length > 0
                    Layout.alignment: Qt.AlignHCenter; Layout.preferredHeight: 24; focusPolicy: Qt.NoFocus
                    onClicked: { var old = imgView.source; imgView.source = ""; imgView.source = old }
                    background: Rectangle { radius: 6; color: "#268b5cf6"; border.color: "#448b5cf6" }
                    contentItem: Text { text: qsTr("Tentar novamente"); color: "#c4b5fd"; font.pixelSize: 10; font.bold: true }
                }
            }

            // Hover ImageToolbar
            Rectangle {
                visible: hoverHandler.hovered && !frameRoot.isLocked
                anchors.top: parent.top; anchors.right: parent.right; anchors.margins: 8; z: 12
                height: 28; width: actRow.implicitWidth + 10; radius: 8
                color: "#e60f0e17"; border.color: "#22ffffff"
                RowLayout {
                    id: actRow; anchors.centerIn: parent; spacing: 2
                    Repeater {
                        model: [{ id: "left", ic: "align-left" }, { id: "center", ic: "align-center" }, { id: "right", ic: "align-right" }]
                        delegate: ToolButton {
                            required property var modelData
                            Layout.preferredWidth: 22; Layout.preferredHeight: 22; focusPolicy: Qt.NoFocus
                            onClicked: frameRoot.alignChanged(modelData.id)
                            background: Rectangle { radius: 4; color: frameRoot.alignMode === modelData.id ? "#338b5cf6" : (parent.hovered ? "#1affffff" : "transparent") }
                            contentItem: AppIcon { anchors.centerIn: parent; name: modelData.ic; color: frameRoot.alignMode === modelData.id ? "#c4b5fd" : "#a7a9be"; width: 11; height: 11 }
                        }
                    }
                    Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 12; color: "#1affffff" }
                    ToolButton {
                        Layout.preferredWidth: 22; Layout.preferredHeight: 22; focusPolicy: Qt.NoFocus
                        ToolTip.visible: hovered; ToolTip.text: qsTr("Ampliar / Recortar")
                        onClicked: frameRoot.viewerRequested()
                        background: Rectangle { radius: 4; color: parent.hovered ? "#1affffff" : "transparent" }
                        contentItem: AppIcon { anchors.centerIn: parent; name: "maximize"; color: "#cbd5e1"; width: 11; height: 11 }
                    }
                    ToolButton {
                        Layout.preferredWidth: 22; Layout.preferredHeight: 22; focusPolicy: Qt.NoFocus
                        ToolTip.visible: hovered; ToolTip.text: qsTr("Copiar imagem")
                        onClicked: frameRoot.copyRequested()
                        background: Rectangle { radius: 4; color: parent.hovered ? "#1affffff" : "transparent" }
                        contentItem: AppIcon { anchors.centerIn: parent; name: "copy"; color: "#cbd5e1"; width: 11; height: 11 }
                    }
                    ToolButton {
                        Layout.preferredWidth: 22; Layout.preferredHeight: 22; focusPolicy: Qt.NoFocus
                        ToolTip.visible: hovered; ToolTip.text: qsTr("Remover imagem")
                        onClicked: frameRoot.deleteRequested()
                        background: Rectangle { radius: 4; color: parent.hovered ? "#22ef4444" : "transparent" }
                        contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fb7185"; width: 11; height: 11 }
                    }
                }
            }

            // Live dimension badge while dragging edge/corner handle
            Rectangle {
                visible: frameRoot.resizing
                anchors.bottom: parent.bottom; anchors.left: parent.left; anchors.margins: 8; z: 14
                width: dimLbl.implicitWidth + 12; height: 22; radius: 6; color: "#ee0f0e17"; border.color: "#8b5cf6"
                Text {
                    id: dimLbl; anchors.centerIn: parent
                    text: Math.round(imageCard.width) + " × " + Math.round(imageCard.height) + " px"
                    color: "#e2e8f0"; font.pixelSize: 10; font.family: "monospace"; font.bold: true
                }
            }

            // Right & Southeast resize handle
            Rectangle {
                visible: (hoverHandler.hovered || frameRoot.resizing) && !frameRoot.isLocked
                anchors.right: parent.right; anchors.bottom: parent.bottom; anchors.margins: 5; z: 15
                width: 12; height: 12; radius: 6; color: "#8b5cf6"; border.color: "#ffffff"; border.width: 1.5
                MouseArea {
                    anchors.fill: parent; anchors.margins: -4; cursorShape: Qt.SizeFDiagCursor
                    property real startX: 0; property int startW: 400
                    onPressed: function(m) { startX = mapToGlobal(m.x, 0).x; startW = Math.round(frameCol.width); frameRoot.resizing = true; frameRoot.previewWidth = startW }
                    onPositionChanged: function(m) {
                        if (!pressed) return
                        var dx = mapToGlobal(m.x, 0).x - startX
                        frameRoot.previewWidth = Math.max(160, Math.min(920, Math.round(startW + dx)))
                    }
                    onReleased: { frameRoot.resizing = false; frameRoot.widthCommitted(frameRoot.previewWidth) }
                }
            }
        }

        TextField {
            Layout.fillWidth: true
            text: frameRoot.caption
            placeholderText: hoverHandler.hovered ? qsTr("Adicionar legenda...") : ""
            visible: frameRoot.caption.length > 0 || hoverHandler.hovered
            horizontalAlignment: TextInput.AlignHCenter
            color: "#94a1b2"; placeholderTextColor: "#52525b"; font.pixelSize: 11; font.italic: true
            background: null
            onEditingFinished: frameRoot.captionCommitted(text)
        }
    }
}
