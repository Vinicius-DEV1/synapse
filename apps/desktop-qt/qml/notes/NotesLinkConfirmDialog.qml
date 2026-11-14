import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: confirmDialog
    objectName: "notesLinkConfirmDialog"
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 440)
    modal: true
    padding: 0
    closePolicy: Popup.CloseOnEscape
    standardButtons: Dialog.NoButton

    property string linkUrl: ""
    property string linkTitle: ""
    property bool copied: false
    property var clipboardController: null

    signal linkConfirmed(string url)

    function openForLink(url, title) {
        linkUrl = String(url || "")
        linkTitle = String(title || "")
        copied = false
        open()
    }

    Timer {
        id: resetCopiedTimer
        interval: 2000
        onTriggered: confirmDialog.copied = false
    }

    background: Rectangle {
        color: "#16151f"
        radius: 16
        border.color: "#22ffffff"
    }

    contentItem: ColumnLayout {
        spacing: 0

        // Header
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: 56
            color: "#08ffffff"
            radius: 16

            Rectangle {
                anchors.bottom: parent.bottom
                width: parent.width
                height: 1
                color: "#0cffffff"
            }

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 20
                anchors.rightMargin: 12

                Label {
                    Layout.fillWidth: true
                    text: qsTr("Abrir Link Externo")
                    color: "#ffffff"
                    font.pixelSize: 15
                    font.bold: true
                }

                ToolButton {
                    text: "×"
                    Accessible.name: qsTr("Fechar confirmação de link")
                    contentItem: Text {
                        text: "×"
                        color: "#a1a1aa"
                        font.pixelSize: 20
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle { color: "transparent" }
                    onClicked: confirmDialog.close()
                }
            }
        }

        // Body
        ColumnLayout {
            Layout.fillWidth: true
            Layout.margins: 20
            spacing: 14

            Label {
                Layout.fillWidth: true
                text: qsTr("Deseja abrir o seguinte link no seu navegador padrão?")
                color: "#94a3b8"
                font.pixelSize: 13
                wrapMode: Text.Wrap
            }

            // Monospace URL display box with one-click copy button
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: Math.max(50, urlRow.implicitHeight + 16)
                color: "#0a0912"
                radius: 12
                border.color: "#18ffffff"

                RowLayout {
                    id: urlRow
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 10

                    TextEdit {
                        id: urlTextEdit
                        Layout.fillWidth: true
                        text: confirmDialog.linkUrl
                        readOnly: true
                        selectByMouse: true
                        color: "#a78bfa"
                        font.family: "monospace"
                        font.pixelSize: 12
                        wrapMode: TextEdit.WrapAnywhere
                    }

                    Button {
                        id: copyButton
                        objectName: "notesLinkConfirmCopyButton"
                        Layout.preferredHeight: 30
                        text: confirmDialog.copied ? qsTr("Copiado! ✓") : qsTr("Copiar")
                        Accessible.name: text
                        contentItem: Text {
                            text: copyButton.text
                            color: confirmDialog.copied ? "#34d399" : "#e2e8f0"
                            font.pixelSize: 11
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        background: Rectangle {
                            color: confirmDialog.copied ? "#1034d399" : "#18ffffff"
                            radius: 6
                            border.color: confirmDialog.copied ? "#4034d399" : "#20ffffff"
                        }
                        onClicked: {
                            if (confirmDialog.clipboardController &&
                                    typeof confirmDialog.clipboardController.copyLinkUrlToClipboard === "function") {
                                confirmDialog.clipboardController.copyLinkUrlToClipboard(confirmDialog.linkUrl)
                            }
                            confirmDialog.copied = true
                            resetCopiedTimer.restart()
                        }
                    }
                }
            }

            Item { Layout.preferredHeight: 4 }

            // Action buttons
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Item { Layout.fillWidth: true }

                Button {
                    id: cancelButton
                    objectName: "notesLinkConfirmCancelButton"
                    Layout.preferredHeight: 36
                    text: qsTr("Cancelar")
                    Accessible.name: text
                    contentItem: Text {
                        text: cancelButton.text
                        color: "#94a3b8"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        color: cancelButton.hovered ? "#14ffffff" : "#08ffffff"
                        radius: 8
                        border.color: "#10ffffff"
                    }
                    onClicked: confirmDialog.close()
                }

                Button {
                    id: openButton
                    objectName: "notesLinkConfirmOpenButton"
                    Layout.preferredHeight: 36
                    text: qsTr("Abrir no Navegador")
                    Accessible.name: text
                    contentItem: Text {
                        text: openButton.text
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        color: openButton.hovered ? "#7c3aed" : "#8b5cf6"
                        radius: 8
                    }
                    onClicked: {
                        Qt.openUrlExternally(confirmDialog.linkUrl)
                        confirmDialog.linkConfirmed(confirmDialog.linkUrl)
                        confirmDialog.close()
                    }
                }
            }
        }
    }
}
