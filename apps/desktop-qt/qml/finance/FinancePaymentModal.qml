import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: paymentModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property var loan: null
    property var accounts: []

    signal closeRequested()
    signal paymentRecorded(string loanId, double amount, string accountId, string date, string notes)

    Shortcut {
        sequence: "Escape"
        enabled: paymentModalRoot.visible
        onActivated: paymentModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: paymentModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 440)
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

                Text { text: "💵"; font.pixelSize: 20 }
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text { text: "Registrar Pagamento"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Text {
                        text: paymentModalRoot.loan ? ("Empréstimo: " + (paymentModalRoot.loan.title || "Empréstimo")) : ""
                        color: "#94a1b2"
                        font.pixelSize: 11
                    }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: paymentModalRoot.closeRequested()
                }
            }

            // Amount Input
            Text { text: "Valor do Pagamento (R$):"; color: "#d4d4d8"; font.pixelSize: 12; font.bold: true }
            TextField {
                id: amountInput
                Layout.fillWidth: true
                placeholderText: "0,00"
                color: "#fffffe"
                validator: DoubleValidator { bottom: 0.01; decimals: 2 }
                background: Rectangle {
                    color: "#1f1d2e"
                    radius: 8
                    border.color: amountInput.activeFocus ? "#10b981" : "#2e2b44"
                }
            }

            // Date Input
            Text { text: "Data do Pagamento:"; color: "#d4d4d8"; font.pixelSize: 12; font.bold: true }
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

            // Account Selector
            Text { text: "Conta:"; color: "#d4d4d8"; font.pixelSize: 12; font.bold: true; visible: paymentModalRoot.accounts.length > 0 }
            ComboBox {
                id: accountCombo
                Layout.fillWidth: true
                visible: paymentModalRoot.accounts.length > 0
                model: paymentModalRoot.accounts
                textRole: "name"
            }

            // Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    text: "Cancelar"
                    Layout.fillWidth: true
                    background: Rectangle { color: "#232135"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#fffffe"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: paymentModalRoot.closeRequested()
                }

                Button {
                    text: "Confirmar Pagamento"
                    Layout.fillWidth: true
                    enabled: Number(amountInput.text.replace(",", ".")) > 0
                    background: Rectangle { color: parent.enabled ? "#10b981" : "#4c4869"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#ffffff"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        var amt = Number(amountInput.text.replace(",", "."))
                        var accId = ""
                        if (paymentModalRoot.accounts && paymentModalRoot.accounts.length > 0) {
                            var idx = Math.max(0, accountCombo.currentIndex)
                            accId = paymentModalRoot.accounts[idx].id || ""
                        } else if (paymentModalRoot.loan && paymentModalRoot.loan.account_id) {
                            accId = paymentModalRoot.loan.account_id
                        }
                        if (amt > 0 && paymentModalRoot.loan && accId.length > 0) {
                            paymentModalRoot.paymentRecorded(paymentModalRoot.loan.id, amt, accId, dateInput.text, "")
                            paymentModalRoot.closeRequested()
                        }
                    }
                }
            }
        }
    }
}
