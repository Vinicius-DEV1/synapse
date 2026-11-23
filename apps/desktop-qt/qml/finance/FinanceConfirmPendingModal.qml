import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: confirmPendingRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: isOpen
    z: 150

    property bool isOpen: false
    property var transaction: null
    property var accounts: []
    property string errorMessage: ""

    signal confirmed(string txId, double amount, string date, string accountId, string description, string category)
    signal closed()

    function loadTransaction() {
        errorMessage = ""
        if (!transaction) return
        var today = Qt.formatDate(new Date(), "yyyy-MM-dd")
        amountInput.text = Number(transaction.amount || 0).toFixed(2)
        dateInput.text = transaction.date || today
        descInput.text = transaction.description || ""
        categoryInput.text = transaction.category || "Geral"

        var accId = transaction.account_id || ""
        var foundIdx = 0
        for (var i = 0; i < accounts.length; i++) {
            if (accounts[i].id === accId) {
                foundIdx = i
                break
            }
        }
        accCombo.currentIndex = foundIdx
    }

    onIsOpenChanged: if (isOpen) loadTransaction()
    onTransactionChanged: if (isOpen) loadTransaction()

    Shortcut {
        sequence: "Escape"
        enabled: confirmPendingRoot.visible
        onActivated: confirmPendingRoot.closed()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: confirmPendingRoot.closed()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 32, 480)
        implicitHeight: modalCol.implicitHeight + 48
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: modalCol
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    width: 36
                    height: 36
                    radius: 10
                    color: "#10b98126"
                    border.color: "#10b9814d"
                    border.width: 1
                    Text {
                        anchors.centerIn: parent
                        text: "✓"
                        color: "#10b981"
                        font.pixelSize: 18
                        font.bold: true
                    }
                }

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: qsTr("Efetivar Transação Pendente")
                        color: "#fffffe"
                        font.pixelSize: 16
                        font.bold: true
                    }
                    Text {
                        text: qsTr("Confirme o valor final e a data de liquidação da conta.")
                        color: "#94a1b2"
                        font.pixelSize: 12
                    }
                }

                Item { Layout.fillWidth: true }

                ToolButton {
                    text: "✕"
                    onClicked: confirmPendingRoot.closed()
                }
            }

            // Description
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4

                Text { text: qsTr("Descrição:"); color: "#a7a9be"; font.pixelSize: 12 }
                TextField {
                    id: descInput
                    Layout.fillWidth: true
                    placeholderText: qsTr("Descrição da transação...")
                }
            }

            // Amount and Date Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { text: qsTr("Valor Final (R$):"); color: "#a7a9be"; font.pixelSize: 12 }
                    TextField {
                        id: amountInput
                        Layout.fillWidth: true
                        placeholderText: "0.00"
                    }
                }

                ColumnLayout {
                    Layout.preferredWidth: 150
                    spacing: 4
                    Text { text: qsTr("Data Efetiva:"); color: "#a7a9be"; font.pixelSize: 12 }
                    TextField {
                        id: dateInput
                        Layout.fillWidth: true
                        placeholderText: "yyyy-MM-dd"
                    }
                }
            }

            // Account & Category Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { text: qsTr("Conta Bancária / Carteira:"); color: "#a7a9be"; font.pixelSize: 12 }
                    ComboBox {
                        id: accCombo
                        Layout.fillWidth: true
                        textRole: "name"
                        model: confirmPendingRoot.accounts
                    }
                }

                ColumnLayout {
                    Layout.preferredWidth: 150
                    spacing: 4
                    Text { text: qsTr("Categoria:"); color: "#a7a9be"; font.pixelSize: 12 }
                    TextField {
                        id: categoryInput
                        Layout.fillWidth: true
                        placeholderText: qsTr("Geral")
                    }
                }
            }

            // Error Label
            Label {
                Layout.fillWidth: true
                visible: confirmPendingRoot.errorMessage.length > 0
                text: confirmPendingRoot.errorMessage
                color: "#fda4af"
                font.pixelSize: 12
                wrapMode: Text.Wrap
            }

            // Buttons Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    text: qsTr("Cancelar")
                    Layout.fillWidth: true
                    onClicked: confirmPendingRoot.closed()
                }

                Button {
                    text: qsTr("✓ Efetivar Transação")
                    Layout.fillWidth: true
                    highlighted: true
                    onClicked: {
                        var parsedAmt = parseFloat(amountInput.text.replace(",", "."))
                        if (isNaN(parsedAmt) || parsedAmt < 0) {
                            confirmPendingRoot.errorMessage = qsTr("Informe um valor final válido.")
                            return
                        }
                        if (descInput.text.trim().length === 0) {
                            confirmPendingRoot.errorMessage = qsTr("Informe uma descrição.")
                            return
                        }
                        var accId = ""
                        if (accCombo.currentIndex >= 0 && accCombo.currentIndex < confirmPendingRoot.accounts.length) {
                            accId = confirmPendingRoot.accounts[accCombo.currentIndex].id || ""
                        }
                        var txId = confirmPendingRoot.transaction ? confirmPendingRoot.transaction.id : ""
                        confirmPendingRoot.confirmed(txId, parsedAmt, dateInput.text.trim(), accId, descInput.text.trim(), categoryInput.text.trim())
                    }
                }
            }
        }
    }
}
