import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: deleteTxModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property var transaction: null

    signal closeRequested()
    signal deleteConfirmed(string txId)

    Shortcut {
        sequence: "Escape"
        enabled: deleteTxModalRoot.visible
        onActivated: deleteTxModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: deleteTxModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 480)
        height: 280
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    width: 36
                    height: 36
                    radius: 8
                    color: "rgba(244, 63, 94, 0.2)"
                    Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 18 }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text { text: "Excluir Transação"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Tem certeza de que deseja excluir esta transação?"; color: "#94a1b2"; font.pixelSize: 12 }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: deleteTxModalRoot.closeRequested()
                }
            }

            // Transaction Info Box
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 8
                color: "#11101a"
                border.color: "#2e2b44"

                ColumnLayout {
                    anchors.centerIn: parent
                    spacing: 6

                    Text {
                        text: deleteTxModalRoot.transaction ? (deleteTxModalRoot.transaction.description || "Transação") : ""
                        color: "#fffffe"
                        font.pixelSize: 15
                        font.bold: true
                        Layout.alignment: Qt.AlignHCenter
                    }

                    Text {
                        text: {
                            if (!deleteTxModalRoot.transaction) return ""
                            var amt = Number(deleteTxModalRoot.transaction.amount || 0).toFixed(2)
                            var isInc = deleteTxModalRoot.transaction.type === "income"
                            return (isInc ? "+ R$ " : "- R$ ") + amt
                        }
                        color: deleteTxModalRoot.transaction && deleteTxModalRoot.transaction.type === "income" ? "#10b981" : "#f43f5e"
                        font.pixelSize: 16
                        font.bold: true
                        Layout.alignment: Qt.AlignHCenter
                    }

                    Text {
                        text: deleteTxModalRoot.transaction ? ((deleteTxModalRoot.transaction.category || "Geral") + " • " + (deleteTxModalRoot.transaction.date || "")) : ""
                        color: "#6b7280"
                        font.pixelSize: 11
                        Layout.alignment: Qt.AlignHCenter
                    }
                }
            }

            // Actions
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    text: "Cancelar"
                    Layout.fillWidth: true
                    background: Rectangle { color: "#232135"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#fffffe"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: deleteTxModalRoot.closeRequested()
                }

                Button {
                    text: "Excluir"
                    Layout.fillWidth: true
                    background: Rectangle { color: "#e11d48"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#ffffff"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        if (deleteTxModalRoot.transaction && deleteTxModalRoot.transaction.id) {
                            deleteTxModalRoot.deleteConfirmed(deleteTxModalRoot.transaction.id)
                        }
                        deleteTxModalRoot.closeRequested()
                    }
                }
            }
        }
    }
}
