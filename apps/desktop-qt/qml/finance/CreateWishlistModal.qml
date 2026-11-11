import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#b3000000"

    signal wishlistSubmitted(string title, double price, string priority)
    signal closed()

    MouseArea { anchors.fill: parent; onClicked: modalRoot.closed() }

    Rectangle {
        anchors.centerIn: parent
        width: 440
        height: 340
        radius: 16
        color: "#1a1924"
        border.color: "#1affffff"

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 28
            spacing: 16

            Text {
                text: "Novo Item de Wishlist"
                color: "#fffffe"
                font.pixelSize: 18
                font.bold: true
            }

            TextField {
                id: wishTitleInput
                Layout.fillWidth: true
                placeholderText: "Título do item desejado..."
            }

            TextField {
                id: wishPriceInput
                Layout.fillWidth: true
                placeholderText: "Preço estimado (R$)..."
            }

            ComboBox {
                id: wishPriorityCombo
                Layout.fillWidth: true
                model: ["medium", "high", "low"]
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
                        var price = parseFloat(wishPriceInput.text) || 0
                        if (wishTitleInput.text.trim().length > 0) {
                            modalRoot.wishlistSubmitted(wishTitleInput.text, price, wishPriorityCombo.currentText)
                            wishTitleInput.text = ""
                            wishPriceInput.text = ""
                        }
                    }
                }
            }
        }
    }
}
