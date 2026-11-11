import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#b3000000"

    signal transactionSubmitted(string description, double amount, string type, string category)
    signal closed()

    property var initialTransaction: null
    property string errorMessage: ""

    function loadInitialTransaction() {
        errorMessage = ""
        if (!initialTransaction) {
            transDescInput.text = ""
            transAmountInput.text = ""
            transTypeCombo.currentIndex = 0
            transCategoryInput.text = "Geral"
            return
        }
        transDescInput.text = initialTransaction.description || ""
        transAmountInput.text = Number(initialTransaction.amount || 0).toString()
        transTypeCombo.currentIndex = transTypeCombo.transactionTypes.indexOf(initialTransaction.type)
        transCategoryInput.text = initialTransaction.category || "Geral"
    }

    onVisibleChanged: if (visible) loadInitialTransaction()
    onInitialTransactionChanged: if (visible) loadInitialTransaction()

    MouseArea { anchors.fill: parent; onClicked: modalRoot.closed() }

    Rectangle {
        anchors.centerIn: parent
        width: 440
        height: 380
        radius: 16
        color: "#1a1924"
        border.color: "#1affffff"

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 28
            spacing: 16

            Text {
                text: modalRoot.initialTransaction ? qsTr("Edit transaction") : qsTr("New transaction")
                color: "#fffffe"
                font.pixelSize: 18
                font.bold: true
            }

            TextField {
                id: transDescInput
                Layout.fillWidth: true
                placeholderText: "Descrição da despesa ou receita..."
            }

            TextField {
                id: transAmountInput
                Layout.fillWidth: true
                placeholderText: "Valor (ex: 250.00)..."
            }

            ComboBox {
                id: transTypeCombo
                Layout.fillWidth: true
                property var transactionTypes: ["expense", "income"]
                model: [qsTr("Expense"), qsTr("Income")]
            }

            TextField {
                id: transCategoryInput
                Layout.fillWidth: true
                placeholderText: "Categoria (Geral, Alimentação, Moradia)..."
                text: "Geral"
            }

            Label {
                Layout.fillWidth: true
                visible: modalRoot.errorMessage.length > 0
                text: modalRoot.errorMessage
                color: "#fda4af"
                font.pixelSize: 11
                wrapMode: Text.Wrap
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12
                Button {
                    text: "Cancelar"
                    Layout.fillWidth: true
                    onClicked: modalRoot.closed()
                }
                Button {
                    text: modalRoot.initialTransaction ? qsTr("Save changes") : qsTr("Save")
                    Layout.fillWidth: true
                    onClicked: {
                        var val = parseFloat(transAmountInput.text)
                        if (transDescInput.text.trim().length === 0 || !isFinite(val) || val < 0 || transTypeCombo.currentIndex < 0) {
                            modalRoot.errorMessage = qsTr("Enter a description and a valid amount.")
                            return
                        }
                        modalRoot.errorMessage = ""
                        modalRoot.transactionSubmitted(transDescInput.text, val,
                                                       transTypeCombo.transactionTypes[transTypeCombo.currentIndex],
                                                       transCategoryInput.text)
                    }
                }
            }
        }
    }
}
