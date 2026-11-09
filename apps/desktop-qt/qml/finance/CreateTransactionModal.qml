import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#b3000000"

    signal transactionSubmitted(string description, double amount, string type, string category)
    signal closed()

    MouseArea { anchors.fill: parent; onClicked: modalRoot.closed() }

    Rectangle {
        anchors.centerIn: parent
        width: 440
        height: 380
        radius: 16
        color: "#1a1924"
        border.color: "#ffffff1a"

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 28
            spacing: 16

            Text {
                text: "Nova Transação"
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
                model: ["expense", "income"]
            }

            TextField {
                id: transCategoryInput
                Layout.fillWidth: true
                placeholderText: "Categoria (Geral, Alimentação, Moradia)..."
                text: "Geral"
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
                    text: "Salvar"
                    Layout.fillWidth: true
                    onClicked: {
                        var val = parseFloat(transAmountInput.text)
                        if (transDescInput.text.trim().length > 0 && !isNaN(val)) {
                            modalRoot.transactionSubmitted(transDescInput.text, val, transTypeCombo.currentText, transCategoryInput.text)
                            transDescInput.text = ""
                            transAmountInput.text = ""
                        }
                    }
                }
            }
        }
    }
}
