import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Popup {
    id: confirmDialog
    anchors.centerIn: parent
    width: 380
    padding: 20
    modal: true
    focus: true
    closePolicy: Popup.CloseOnEscape
    dim: true

    property string titleText: qsTr("Confirmação")
    property string messageText: ""
    property string confirmButtonText: qsTr("Confirmar")
    property string cancelButtonText: qsTr("Cancelar")
    property string kind: "warning" // "info", "warning", "error"
    property var callback: null

    function triggerCallback() {
        var cb = confirmDialog.callback
        if (typeof cb === "function") {
            cb()
        }
    }

    signal confirmed()
    signal cancelled()

    function showDialog(title, message, onConfirmed, dialogKind, confirmLabel, cancelLabel) {
        titleText = title || qsTr("Confirmação")
        messageText = message || ""
        callback = onConfirmed || null
        kind = dialogKind || "warning"
        confirmButtonText = confirmLabel || qsTr("Confirmar")
        cancelButtonText = cancelLabel || qsTr("Cancelar")
        open()
    }

    Theme { id: theme }

    Overlay.modal: Rectangle {
        color: "#99000000"
    }

    background: Rectangle {
        color: theme.bgDarkCard
        radius: 12
        border.color: confirmDialog.kind === "error" ? theme.errorBorder :
                      (confirmDialog.kind === "warning" ? theme.warningBorder : theme.borderBrand)
        border.width: 1
    }

    contentItem: ColumnLayout {
        spacing: 16

        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            AppIcon {
                Layout.preferredWidth: 20
                Layout.preferredHeight: 20
                name: confirmDialog.kind === "error" ? "alert" :
                      (confirmDialog.kind === "warning" ? "alert" : "info")
                color: confirmDialog.kind === "error" ? theme.error :
                       (confirmDialog.kind === "warning" ? theme.warning : theme.brand400)
            }

            Text {
                text: confirmDialog.titleText
                color: theme.textDark
                font.pixelSize: 15
                font.bold: true
                font.family: theme.fontFamily
                Layout.fillWidth: true
            }
        }

        Text {
            text: confirmDialog.messageText
            color: theme.textSubtext
            font.pixelSize: 13
            font.family: theme.fontFamily
            wrapMode: Text.Wrap
            Layout.fillWidth: true
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.topMargin: 8
            spacing: 10

            Item { Layout.fillWidth: true }

            Rectangle {
                Layout.preferredWidth: 90
                Layout.preferredHeight: 32
                radius: 6
                color: cancelBtnMouse.containsMouse ? theme.bgHover : "transparent"
                border.color: theme.borderSubtle
                border.width: 1

                Text {
                    anchors.centerIn: parent
                    text: confirmDialog.cancelButtonText
                    color: theme.textSubtext
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                }

                MouseArea {
                    id: cancelBtnMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        confirmDialog.close()
                        confirmDialog.cancelled()
                    }
                }
            }

            Rectangle {
                Layout.preferredWidth: 100
                Layout.preferredHeight: 32
                radius: 6
                color: confirmDialog.kind === "error" ? (confirmBtnMouse.containsMouse ? "#be123c" : theme.error) :
                       (confirmBtnMouse.containsMouse ? theme.brand600 : theme.brand500)

                Text {
                    anchors.centerIn: parent
                    text: confirmDialog.confirmButtonText
                    color: "#ffffff"
                    font.pixelSize: 12
                    font.bold: true
                    font.family: theme.fontFamily
                }

                MouseArea {
                    id: confirmBtnMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        confirmDialog.close()
                        confirmDialog.triggerCallback()
                        confirmDialog.confirmed()
                    }
                }
            }
        }
    }
}
