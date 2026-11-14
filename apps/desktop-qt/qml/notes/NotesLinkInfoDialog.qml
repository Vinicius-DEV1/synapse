import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: infoDialog
    objectName: "notesLinkInfoDialog"
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 540)
    modal: true
    padding: 0
    closePolicy: Popup.CloseOnEscape
    standardButtons: Dialog.NoButton

    property string linkUrl: ""
    property string linkTitle: ""
    property string linkDomain: ""
    property string linkStatus: ""
    property string linkNotes: ""
    property var clipboardController: null
    property bool copied: false

    function openForLink(url, title, status, notes) {
        linkUrl = String(url || "")
        linkTitle = String(title || "")
        linkStatus = String(status || "")
        linkNotes = String(notes || "")
        try {
            var match = linkUrl.match(/^https?:\/\/([^/?#:]+)/i)
            linkDomain = match ? match[1].replace(/^www\./i, "") : ""
        } catch (e) {
            linkDomain = ""
        }
        copied = false
        open()
    }

    Timer {
        id: resetCopiedTimer
        interval: 2000
        onTriggered: infoDialog.copied = false
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
                    text: qsTr("✨ Informações & Resumo do Link")
                    color: "#ffffff"
                    font.pixelSize: 15
                    font.bold: true
                }

                ToolButton {
                    text: "×"
                    Accessible.name: qsTr("Fechar informações")
                    contentItem: Text {
                        text: "×"
                        color: "#a1a1aa"
                        font.pixelSize: 20
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle { color: "transparent" }
                    onClicked: infoDialog.close()
                }
            }
        }

        // Body
        ColumnLayout {
            Layout.fillWidth: true
            Layout.margins: 20
            spacing: 12

            Label {
                Layout.fillWidth: true
                text: infoDialog.linkTitle.length > 0 ? infoDialog.linkTitle : infoDialog.linkDomain
                color: "#ffffff"
                font.pixelSize: 15
                font.bold: true
                wrapMode: Text.Wrap
            }

            Label {
                Layout.fillWidth: true
                text: infoDialog.linkUrl
                color: "#a78bfa"
                font.family: "monospace"
                font.pixelSize: 12
                wrapMode: Text.WrapAnywhere
            }

            RowLayout {
                spacing: 8
                Rectangle {
                    implicitWidth: statusText.implicitWidth + 14
                    implicitHeight: 24
                    radius: 6
                    color: "#18ffffff"
                    border.color: "#26ffffff"
                    Text {
                        id: statusText
                        anchors.centerIn: parent
                        text: infoDialog.linkStatus.length > 0 ? infoDialog.linkStatus : qsTr("Status: Normal")
                        color: "#e2e8f0"
                        font.pixelSize: 11
                    }
                }
                Rectangle {
                    visible: infoDialog.linkDomain.length > 0
                    implicitWidth: domainText.implicitWidth + 14
                    implicitHeight: 24
                    radius: 6
                    color: "#158b5cf6"
                    border.color: "#308b5cf6"
                    Text {
                        id: domainText
                        anchors.centerIn: parent
                        text: infoDialog.linkDomain
                        color: "#c4b5fd"
                        font.pixelSize: 11
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                implicitHeight: 1
                color: "#0cffffff"
            }

            Label {
                text: qsTr("Anotações Associadas:")
                color: "#94a3b8"
                font.pixelSize: 12
                font.bold: true
            }

            Rectangle {
                Layout.fillWidth: true
                implicitHeight: Math.max(60, Math.min(160, notesDisplayText.implicitHeight + 16))
                color: "#0a0912"
                radius: 10
                border.color: "#14ffffff"

                ScrollView {
                    anchors.fill: parent
                    anchors.margins: 8
                    clip: true

                    Text {
                        id: notesDisplayText
                        width: parent.width
                        text: infoDialog.linkNotes.length > 0 ? infoDialog.linkNotes : qsTr("Nenhuma anotação vinculada a este link ainda.")
                        color: infoDialog.linkNotes.length > 0 ? "#f1f5f9" : "#64748b"
                        font.pixelSize: 12
                        wrapMode: Text.Wrap
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 10
                Layout.topMargin: 8

                Button {
                    text: infoDialog.copied ? qsTr("Copiado! ✓") : qsTr("📋 Copiar Link")
                    contentItem: Text {
                        text: parent.text
                        color: infoDialog.copied ? "#34d399" : "#e2e8f0"
                        font.pixelSize: 12
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        color: infoDialog.copied ? "#1034d399" : "#14ffffff"
                        radius: 8
                        border.color: infoDialog.copied ? "#4034d399" : "#20ffffff"
                    }
                    onClicked: {
                        if (infoDialog.clipboardController &&
                                typeof infoDialog.clipboardController.copyLinkUrlToClipboard === "function") {
                            infoDialog.clipboardController.copyLinkUrlToClipboard(infoDialog.linkUrl)
                        }
                        infoDialog.copied = true
                        resetCopiedTimer.restart()
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    text: qsTr("Fechar")
                    contentItem: Text {
                        text: parent.text
                        color: "#94a3b8"
                        font.pixelSize: 12
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        color: "#0a0912"
                        radius: 8
                        border.color: "#18ffffff"
                    }
                    onClicked: infoDialog.close()
                }
            }
        }
    }
}
