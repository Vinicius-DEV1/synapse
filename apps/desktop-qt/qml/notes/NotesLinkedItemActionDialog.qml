import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Dialog {
    id: actionDialog
    objectName: "notesLinkedItemActionDialog"
    parent: Overlay.overlay
    anchors.centerIn: parent
    width: Math.min(parent ? parent.width - 32 : 400, 400)
    modal: true
    focus: true
    padding: 0
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    standardButtons: Dialog.NoButton
    Overlay.modal: Rectangle { color: "#80000000" }

    property string itemKind: "media"
    property string itemId: ""
    property string itemTitle: ""

    signal previewRequested(string itemId, string itemTitle)
    signal openCurrentTabRequested(string itemKind, string itemId, string itemTitle)
    signal openNewTabRequested(string itemKind, string itemId, string itemTitle)

    onOpened: currentTabButton.forceActiveFocus()

    function openFor(kind, id, title) {
        itemKind = String(kind || "media")
        itemId = String(id || "")
        itemTitle = String(title || "")
        if (itemId.length === 0) return
        open()
    }

    background: Rectangle {
        color: "#1a1924"
        radius: 12
        border.color: "#33ffffff"
        border.width: 1
    }

    header: Rectangle {
        implicitHeight: 58
        color: "#08ffffff"
        radius: 12

        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 18
            anchors.rightMargin: 10
            spacing: 10

            Rectangle {
                Layout.preferredWidth: 30
                Layout.preferredHeight: 30
                radius: 8
                color: actionDialog.itemKind === "file" ? "#1a3b82f6"
                      : actionDialog.itemKind === "video" ? "#1a8b5cf6" : "#1a3b82f6"
                AppIcon {
                    anchors.centerIn: parent
                    name: actionDialog.itemKind === "file" ? "file-text"
                          : actionDialog.itemKind === "video" ? "film" : "book-open"
                    color: actionDialog.itemKind === "video" ? "#c084fc" : "#60a5fa"
                    width: 16
                    height: 16
                }
            }

            Label {
                Layout.fillWidth: true
                text: actionDialog.itemKind === "file" ? qsTr("Abrir Documento")
                      : actionDialog.itemKind === "video" ? qsTr("Abrir Vídeo") : qsTr("Abrir Livro")
                color: "#fffffe"
                font.pixelSize: 15
                font.weight: Font.Medium
            }

            ToolButton {
                text: "×"
                Accessible.name: qsTr("Fechar opções de abertura")
                onClicked: actionDialog.close()
            }
        }

        Rectangle {
            anchors.bottom: parent.bottom
            width: parent.width
            height: 1
            color: "#0cffffff"
        }
    }

    contentItem: Item {
        implicitHeight: actionOptions.implicitHeight + 36
        ColumnLayout {
            id: actionOptions
            anchors.fill: parent
            anchors.margins: 18
            spacing: 12

            Label {
                Layout.fillWidth: true
                wrapMode: Text.Wrap
                text: qsTr("Como deseja abrir %1?").arg(actionDialog.itemTitle ||
                     (actionDialog.itemKind === "file" ? qsTr("este documento")
                      : actionDialog.itemKind === "video" ? qsTr("este vídeo") : qsTr("este livro")))
                color: "#a7a9be"
                font.pixelSize: 12
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8

                Button {
                    id: quickPreviewButton
                    objectName: "notesLinkedItemQuickPreviewButton"
                    Layout.fillWidth: true
                    visible: actionDialog.itemKind === "file"
                    text: qsTr("Visualizador Rápido")
                    Accessible.description: qsTr("Abre uma prévia temporária em nova guia")
                    onClicked: {
                        actionDialog.previewRequested(actionDialog.itemId, actionDialog.itemTitle)
                        actionDialog.close()
                    }
                    background: Rectangle {
                        radius: 9
                        color: quickPreviewButton.hovered ? "#1affffff" : "#0dffffff"
                        border.color: quickPreviewButton.hovered ? "#553b82f6" : "#12ffffff"
                    }
                    contentItem: RowLayout {
                        spacing: 12
                        Rectangle {
                            Layout.preferredWidth: 32
                            Layout.preferredHeight: 32
                            radius: 7
                            color: "#1a3b82f6"
                            AppIcon { anchors.centerIn: parent; name: "maximize"; color: "#60a5fa"; width: 16; height: 16 }
                        }
                        ColumnLayout {
                            spacing: 2
                            Label { text: quickPreviewButton.text; color: "#fffffe"; font.pixelSize: 12; font.weight: Font.Medium }
                            Label { text: qsTr("Abre uma prévia temporária em nova guia"); color: "#a7a9be"; font.pixelSize: 10 }
                        }
                    }
                }

                Button {
                    id: currentTabButton
                    objectName: "notesLinkedItemCurrentTabButton"
                    Layout.fillWidth: true
                    text: actionDialog.itemKind === "file"
                          ? qsTr("Leitor Completo (Nesta Guia)") : qsTr("Abrir nesta Guia")
                    Accessible.description: qsTr("Substitui a visualização atual")
                    onClicked: {
                        actionDialog.openCurrentTabRequested(actionDialog.itemKind,
                                                             actionDialog.itemId,
                                                             actionDialog.itemTitle)
                        actionDialog.close()
                    }
                    background: Rectangle {
                        radius: 9
                        color: currentTabButton.hovered ? "#1affffff" : "#0dffffff"
                        border.color: currentTabButton.hovered ? "#553b82f6" : "#12ffffff"
                    }
                    contentItem: RowLayout {
                        spacing: 12
                        Rectangle {
                            Layout.preferredWidth: 32
                            Layout.preferredHeight: 32
                            radius: 7
                            color: "#1a8b5cf6"
                            AppIcon { anchors.centerIn: parent; name: "arrow-right"; color: "#a78bfa"; width: 16; height: 16 }
                        }
                        ColumnLayout {
                            spacing: 2
                            Label { text: currentTabButton.text; color: "#fffffe"; font.pixelSize: 12; font.weight: Font.Medium }
                            Label { text: qsTr("Substitui a visualização atual"); color: "#a7a9be"; font.pixelSize: 10 }
                        }
                    }
                }

                Button {
                    id: newTabButton
                    objectName: "notesLinkedItemNewTabButton"
                    Layout.fillWidth: true
                    text: actionDialog.itemKind === "file"
                          ? qsTr("Leitor Completo (Nova Guia)") : qsTr("Abrir em Nova Guia")
                    Accessible.description: qsTr("Mantém esta anotação aberta")
                    onClicked: {
                        actionDialog.openNewTabRequested(actionDialog.itemKind,
                                                         actionDialog.itemId,
                                                         actionDialog.itemTitle)
                        actionDialog.close()
                    }
                    background: Rectangle {
                        radius: 9
                        color: newTabButton.hovered ? "#1affffff" : "#0dffffff"
                        border.color: newTabButton.hovered ? "#55a78bfa" : "#12ffffff"
                    }
                    contentItem: RowLayout {
                        spacing: 12
                        Rectangle {
                            Layout.preferredWidth: 32
                            Layout.preferredHeight: 32
                            radius: 7
                            color: "#1a8b5cf6"
                            AppIcon { anchors.centerIn: parent; name: "external-link"; color: "#c084fc"; width: 16; height: 16 }
                        }
                        ColumnLayout {
                            spacing: 2
                            Label { text: newTabButton.text; color: "#fffffe"; font.pixelSize: 12; font.weight: Font.Medium }
                            Label { text: qsTr("Mantém esta anotação aberta"); color: "#a7a9be"; font.pixelSize: 10 }
                        }
                    }
                }
            }
        }
    }
}
