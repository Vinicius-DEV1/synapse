import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: acquireModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property var item: null
    property var accounts: []

    signal closeRequested()
    signal purchaseConfirmed(string itemId, string title, double amount, string accountId, string date)

    Shortcut {
        sequence: "Escape"
        enabled: acquireModalRoot.visible
        onActivated: acquireModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: acquireModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 460)
        height: 320
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 14

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Text { text: "🛍️"; font.pixelSize: 20 }
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text { text: "Adquirir Item da Wishlist"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Text {
                        text: acquireModalRoot.item ? (acquireModalRoot.item.title + " (R$ " + Number(acquireModalRoot.item.price || 0).toFixed(2) + ")") : ""
                        color: "#94a1b2"
                        font.pixelSize: 11
                    }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: acquireModalRoot.closeRequested()
                }
            }

            // Account Selector
            Text { text: "Debitar da Conta:"; color: "#d4d4d8"; font.pixelSize: 12; font.bold: true }
            ComboBox {
                id: accCombo
                Layout.fillWidth: true
                model: acquireModalRoot.accounts.map(function(a) { return a.name })
            }

            // Date Input
            Text { text: "Data da Compra:"; color: "#d4d4d8"; font.pixelSize: 12; font.bold: true }
            TextField {
                id: dateInput
                Layout.fillWidth: true
                text: Qt.formatDate(new Date(), "yyyy-MM-dd")
                color: "#fffffe"
                background: Rectangle {
                    color: "#1f1d2e"
                    radius: 8
                    border.color: "#2e2b44"
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
                    onClicked: acquireModalRoot.closeRequested()
                }

                Button {
                    text: "Confirmar Compra"
                    Layout.fillWidth: true
                    background: Rectangle { color: "#10b981"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#ffffff"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        if (acquireModalRoot.item) {
                            var accId = ""
                            if (accCombo.currentIndex >= 0 && accCombo.currentIndex < acquireModalRoot.accounts.length) {
                                accId = acquireModalRoot.accounts[accCombo.currentIndex].id
                            }
                            acquireModalRoot.purchaseConfirmed(
                                acquireModalRoot.item.id,
                                acquireModalRoot.item.title,
                                Number(acquireModalRoot.item.price || 0),
                                accId,
                                dateInput.text
                            )
                            acquireModalRoot.closeRequested()
                        }
                    }
                }
            }
        }
    }
}
