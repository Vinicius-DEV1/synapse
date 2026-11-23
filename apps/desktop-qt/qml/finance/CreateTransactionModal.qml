import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: isOpen
    z: 140

    property bool isOpen: false
    property var accounts: []
    property var initialTransaction: null
    property string errorMessage: ""

    readonly property bool isEditing: initialTransaction !== null && initialTransaction !== undefined
    readonly property bool isTransfer: transTypeCombo.currentIndex === 2

    signal transactionSubmitted(string description, double amount, string type, string category, string date, string accountId, string destinationAccountId, string status)
    signal closed()

    function loadInitialTransaction() {
        errorMessage = ""
        var today = Qt.formatDate(new Date(), "yyyy-MM-dd")
        if (!initialTransaction) {
            transDescInput.text = ""
            transAmountInput.text = ""
            transTypeCombo.currentIndex = 0
            transCategoryInput.text = "Geral"
            transDateInput.text = today
            accCombo.currentIndex = 0
            fromAccCombo.currentIndex = 0
            toAccCombo.currentIndex = (modalRoot.accounts.length > 1) ? 1 : 0
            transPendingCheck.checked = false
            return
        }
        transDescInput.text = initialTransaction.description || ""
        transAmountInput.text = Number(initialTransaction.amount || 0).toString()
        var typeIdx = transTypeCombo.transactionTypes.indexOf(initialTransaction.type)
        transTypeCombo.currentIndex = typeIdx >= 0 ? typeIdx : 0
        transCategoryInput.text = initialTransaction.category || "Geral"
        transDateInput.text = initialTransaction.date || today
        transPendingCheck.checked = initialTransaction.status === "pending" || initialTransaction.is_paid === 0

        // Select account in combo
        for (var i = 0; i < modalRoot.accounts.length; i++) {
            if (modalRoot.accounts[i].id === initialTransaction.account_id) {
                accCombo.currentIndex = i
                fromAccCombo.currentIndex = i
                break
            }
        }
        for (var j = 0; j < modalRoot.accounts.length; j++) {
            if (modalRoot.accounts[j].id === initialTransaction.destination_account_id) {
                toAccCombo.currentIndex = j
                break
            }
        }
    }

    onIsOpenChanged: if (isOpen) loadInitialTransaction()
    onInitialTransactionChanged: if (isOpen) loadInitialTransaction()

    MouseArea { anchors.fill: parent; onClicked: modalRoot.closed() }

    Rectangle {
        anchors.centerIn: parent
        width: 460
        height: modalRoot.isTransfer ? 480 : 490
        radius: 16
        color: "#1a1924"
        border.color: "#1affffff"

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 12

            Text {
                text: modalRoot.isEditing ? qsTr("Edit transaction") : qsTr("New transaction")
                color: "#fffffe"
                font.pixelSize: 18
                font.bold: true
            }

            // Description
            TextField {
                id: transDescInput
                Layout.fillWidth: true
                placeholderText: "Descrição da transação..."
            }

            // Amount and Type Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                TextField {
                    id: transAmountInput
                    Layout.fillWidth: true
                    placeholderText: "Valor (ex: 250.00)..."
                }

                ComboBox {
                    id: transTypeCombo
                    Layout.preferredWidth: 150
                    property var transactionTypes: ["expense", "income", "transfer"]
                    model: ["Despesa", "Receita", "Transferência"]
                }
            }

            // Category & Date (for income/expense)
            RowLayout {
                Layout.fillWidth: true
                spacing: 10
                visible: !modalRoot.isTransfer

                TextField {
                    id: transCategoryInput
                    Layout.fillWidth: true
                    placeholderText: "Categoria (Alimentação, Salário, etc)..."
                    text: "Geral"
                }

                TextField {
                    id: transDateInput
                    Layout.preferredWidth: 130
                    placeholderText: "yyyy-MM-dd"
                }
            }

            // Account Selector (for income/expense)
            RowLayout {
                Layout.fillWidth: true
                spacing: 10
                visible: !modalRoot.isTransfer

                Text { text: "Conta:"; color: "#a7a9be"; font.pixelSize: 12 }

                ComboBox {
                    id: accCombo
                    Layout.fillWidth: true
                    textRole: "name"
                    model: modalRoot.accounts
                }
            }

            // Pending Checkbox
            CheckBox {
                id: transPendingCheck
                text: qsTr("Marcar como pendente / futura (não altera o saldo)")
                visible: !modalRoot.isTransfer
                checked: false
                contentItem: Text {
                    text: transPendingCheck.text
                    font.pixelSize: 12
                    color: transPendingCheck.checked ? "#fbbf24" : "#a7a9be"
                    verticalAlignment: Text.AlignVCenter
                    leftPadding: transPendingCheck.indicator.width + 6
                }
            }

            // Transfer Accounts Row (Origin & Destination)
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8
                visible: modalRoot.isTransfer

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 10
                    Text { text: "Origem:"; color: "#f43f5e"; font.pixelSize: 12; Layout.preferredWidth: 50 }
                    ComboBox {
                        id: fromAccCombo
                        Layout.fillWidth: true
                        textRole: "name"
                        model: modalRoot.accounts
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 10
                    Text { text: "Destino:"; color: "#34d399"; font.pixelSize: 12; Layout.preferredWidth: 50 }
                    ComboBox {
                        id: toAccCombo
                        Layout.fillWidth: true
                        textRole: "name"
                        model: modalRoot.accounts
                    }
                }
            }

            Label {
                Layout.fillWidth: true
                visible: modalRoot.errorMessage.length > 0
                text: modalRoot.errorMessage
                color: "#fda4af"
                font.pixelSize: 11
                wrapMode: Text.Wrap
            }

            Item { Layout.fillHeight: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12
                Button {
                    text: "Cancelar"
                    Layout.fillWidth: true
                    onClicked: modalRoot.closed()
                }
                Button {
                    text: modalRoot.isEditing ? qsTr("Save changes") : qsTr("Save")
                    Layout.fillWidth: true
                    highlighted: true
                    onClicked: {
                        var val = parseFloat(transAmountInput.text)
                        var type = transTypeCombo.transactionTypes[transTypeCombo.currentIndex]
                        if (transDescInput.text.trim().length === 0 || !isFinite(val) || val <= 0) {
                            modalRoot.errorMessage = "Informe uma descrição e um valor positivo."
                            return
                        }

                        var date = transDateInput.text.trim()
                        if (date.length === 0) {
                            date = Qt.formatDate(new Date(), "yyyy-MM-dd")
                        }

                        var accId = ""
                        var destId = ""

                        if (type === "transfer") {
                            if (modalRoot.accounts.length < 2) {
                                modalRoot.errorMessage = "Cadastre ao menos duas contas para realizar transferências."
                                return
                            }
                            var fromAcc = modalRoot.accounts[fromAccCombo.currentIndex]
                            var toAcc = modalRoot.accounts[toAccCombo.currentIndex]
                            if (!fromAcc || !toAcc || fromAcc.id === toAcc.id) {
                                modalRoot.errorMessage = "A conta de origem e destino devem ser diferentes."
                                return
                            }
                            accId = fromAcc.id
                            destId = toAcc.id
                        } else {
                            if (modalRoot.accounts.length > 0 && accCombo.currentIndex >= 0 && accCombo.currentIndex < modalRoot.accounts.length) {
                                accId = modalRoot.accounts[accCombo.currentIndex].id
                            }
                        }

                        modalRoot.errorMessage = ""
                        var status = transPendingCheck.visible && transPendingCheck.checked ? "pending" : "completed"
                        modalRoot.transactionSubmitted(
                            transDescInput.text.trim(),
                            val,
                            type,
                            type === "transfer" ? "Transferência" : transCategoryInput.text.trim(),
                            date,
                            accId,
                            destId,
                            status
                        )
                    }
                }
            }
        }
    }
}
