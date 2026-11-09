import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: financeRoot
    color: "#0f0e17" // bg-dark-bg

    property var summary: ({ income: 0, expense: 0, balance: 0 })
    property var transactions: []
    property var wishlistItems: []
    property string activeSubTab: "transactions" // "transactions", "wishlist"
    property bool isAddingTransaction: false
    property bool isAddingWishlistItem: false

    function refreshData() {
        summary = dataController.getFinancialSummary()
        transactions = dataController.getTransactions()
        wishlistItems = dataController.getWishlist()
    }

    Component.onCompleted: {
        refreshData()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        // Header and Action Buttons
        RowLayout {
            Layout.fillWidth: true
            spacing: 16

            ColumnLayout {
                spacing: 4
                Text {
                    text: "💰 Finanças Pessoais & Wishlist"
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
                Text {
                    text: "Gestão financeira local, controle de fluxo de caixa e lista de compras com SQLite"
                    color: "#a7a9be"
                    font.pixelSize: 13
                }
            }

            Item { Layout.fillWidth: true }

            // + Nova Transação Button
            Rectangle {
                width: 146; height: 38; radius: 10
                color: "#7c3aed" // brand-600

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Nova Transação"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: financeRoot.isAddingTransaction = true
                }
            }

            // + Item Wishlist Button
            Rectangle {
                width: 120; height: 38; radius: 10
                color: "#1a1924"
                border.color: "#8b5cf64d"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "★"; color: "#c4b5fd"; font.pixelSize: 13 }
                    Text { text: "Wishlist"; color: "#c4b5fd"; font.pixelSize: 13; font.bold: true }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: financeRoot.isAddingWishlistItem = true
                }
            }
        }

        // 3 Summary Cards (Receitas, Despesas, Saldo Líquido)
        RowLayout {
            Layout.fillWidth: true
            spacing: 16

            // Card 1: Receitas
            Rectangle {
                Layout.fillWidth: true
                height: 90
                radius: 12
                color: "#1a1924"
                border.color: "#10b98133"
                border.width: 1

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 18
                    spacing: 4

                    RowLayout {
                        Text { text: "RECEITAS TOTAIS"; color: "#10b981"; font.pixelSize: 11; font.bold: true; font.letterSpacing: 1.2 }
                        Item { Layout.fillWidth: true }
                        Text { text: "↑"; color: "#10b981"; font.pixelSize: 14; font.bold: true }
                    }

                    Text {
                        text: "R$ " + Number(financeRoot.summary.income || 0).toLocaleString(Qt.locale("pt_BR"), 'f', 2)
                        color: "#fffffe"
                        font.pixelSize: 22
                        font.bold: true
                    }
                }
            }

            // Card 2: Despesas
            Rectangle {
                Layout.fillWidth: true
                height: 90
                radius: 12
                color: "#1a1924"
                border.color: "#f43f5e33"
                border.width: 1

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 18
                    spacing: 4

                    RowLayout {
                        Text { text: "DESPESAS TOTAIS"; color: "#fb7185"; font.pixelSize: 11; font.bold: true; font.letterSpacing: 1.2 }
                        Item { Layout.fillWidth: true }
                        Text { text: "↓"; color: "#fb7185"; font.pixelSize: 14; font.bold: true }
                    }

                    Text {
                        text: "R$ " + Number(financeRoot.summary.expense || 0).toLocaleString(Qt.locale("pt_BR"), 'f', 2)
                        color: "#fffffe"
                        font.pixelSize: 22
                        font.bold: true
                    }
                }
            }

            // Card 3: Saldo Líquido
            Rectangle {
                Layout.fillWidth: true
                height: 90
                radius: 12
                color: "#1a1924"
                border.color: "#8b5cf64d"
                border.width: 1

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 18
                    spacing: 4

                    RowLayout {
                        Text { text: "SALDO LÍQUIDO"; color: "#c4b5fd"; font.pixelSize: 11; font.bold: true; font.letterSpacing: 1.2 }
                        Item { Layout.fillWidth: true }
                        Text { text: "●"; color: "#8b5cf6"; font.pixelSize: 12 }
                    }

                    Text {
                        text: "R$ " + Number(financeRoot.summary.balance || 0).toLocaleString(Qt.locale("pt_BR"), 'f', 2)
                        color: financeRoot.summary.balance >= 0 ? "#34d399" : "#fb7185"
                        font.pixelSize: 22
                        font.bold: true
                    }
                }
            }
        }

        // Subtabs: Transações vs Wishlist
        RowLayout {
            spacing: 8

            Rectangle {
                width: 150; height: 36; radius: 8
                color: financeRoot.activeSubTab === "transactions" ? "#8b5cf61a" : "transparent"
                border.color: financeRoot.activeSubTab === "transactions" ? "#8b5cf64d" : "transparent"
                Text {
                    anchors.centerIn: parent
                    text: "Transações (" + financeRoot.transactions.length + ")"
                    color: financeRoot.activeSubTab === "transactions" ? "#c4b5fd" : "#a7a9be"
                    font.pixelSize: 13
                    font.bold: true
                }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: financeRoot.activeSubTab = "transactions"
                }
            }

            Rectangle {
                width: 150; height: 36; radius: 8
                color: financeRoot.activeSubTab === "wishlist" ? "#8b5cf61a" : "transparent"
                border.color: financeRoot.activeSubTab === "wishlist" ? "#8b5cf64d" : "transparent"
                Text {
                    anchors.centerIn: parent
                    text: "Wishlist (" + financeRoot.wishlistItems.length + ")"
                    color: financeRoot.activeSubTab === "wishlist" ? "#c4b5fd" : "#a7a9be"
                    font.pixelSize: 13
                    font.bold: true
                }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: financeRoot.activeSubTab = "wishlist"
                }
            }
        }

        // Main List Area
        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: financeRoot.activeSubTab === "transactions" ? 0 : 1

            // 1. Transactions List
            ListView {
                id: transListView
                clip: true
                model: financeRoot.transactions
                spacing: 8

                delegate: Rectangle {
                    width: transListView.width
                    height: 60
                    radius: 10
                    color: "#1a1924"
                    border.color: transItemMouse.containsMouse ? "#8b5cf64d" : "#ffffff0f"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 16

                        Rectangle {
                            width: 6; height: 34; radius: 3
                            color: modelData.type === "income" ? "#10b981" : (modelData.type === "expense" ? "#f43f5e" : "#f59e0b")
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 3
                            Text {
                                text: modelData.description
                                color: "#fffffe"
                                font.pixelSize: 14
                                font.bold: true
                            }
                            Text {
                                text: (modelData.category || "Geral") + " • " + (modelData.date || "")
                                color: "#a7a9be"
                                font.pixelSize: 12
                            }
                        }

                        Text {
                            text: (modelData.type === "income" ? "+ R$ " : "- R$ ") + Number(modelData.amount || 0).toFixed(2)
                            color: modelData.type === "income" ? "#34d399" : "#fffffe"
                            font.pixelSize: 16
                            font.bold: true
                        }
                    }

                    MouseArea {
                        id: transItemMouse
                        anchors.fill: parent
                        hoverEnabled: true
                    }
                }

                Text {
                    anchors.centerIn: parent
                    visible: financeRoot.transactions.length === 0
                    text: "Nenhuma transação registrada no banco."
                    color: "#64748b"
                    font.pixelSize: 15
                }
            }

            // 2. Wishlist List
            ListView {
                id: wishListView
                clip: true
                model: financeRoot.wishlistItems
                spacing: 8

                delegate: Rectangle {
                    width: wishListView.width
                    height: 64
                    radius: 10
                    color: "#1a1924"
                    border.color: wishItemMouse.containsMouse ? "#8b5cf64d" : "#ffffff0f"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 16

                        Rectangle {
                            width: 10; height: 10; radius: 5
                            color: modelData.priority === "high" ? "#f43f5e" : (modelData.priority === "medium" ? "#f59e0b" : "#10b981")
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 3
                            Text {
                                text: modelData.title
                                color: "#fffffe"
                                font.pixelSize: 14
                                font.bold: true
                            }
                            Text {
                                text: (modelData.category || "Desejo") + (modelData.link ? " • Possui link externo" : "")
                                color: "#a7a9be"
                                font.pixelSize: 12
                            }
                        }

                        Text {
                            text: "R$ " + Number(modelData.price || 0).toFixed(2)
                            color: "#c4b5fd"
                            font.pixelSize: 16
                            font.bold: true
                        }

                        Rectangle {
                            width: 76; height: 30; radius: 6
                            color: "#f43f5e1a"
                            border.color: "#f43f5e33"

                            Text {
                                anchors.centerIn: parent
                                text: "Remover"
                                color: "#fb7185"
                                font.pixelSize: 11
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    dataController.deleteWishlistItem(modelData.id)
                                    financeRoot.refreshData()
                                }
                            }
                        }
                    }

                    MouseArea {
                        id: wishItemMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        z: -1
                    }
                }

                Text {
                    anchors.centerIn: parent
                    visible: financeRoot.wishlistItems.length === 0
                    text: "Nenhum item na sua Wishlist ainda."
                    color: "#64748b"
                    font.pixelSize: 15
                }
            }
        }
    }

    // Modal: Adicionar Transação
    Rectangle {
        anchors.fill: parent
        color: "#b3000000"
        visible: financeRoot.isAddingTransaction

        MouseArea { anchors.fill: parent }

        Rectangle {
            anchors.centerIn: parent
            width: 440
            height: 380
            radius: 16
            color: "#1a1924"
            border.color: "#ffffff1a"

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
                        onClicked: financeRoot.isAddingTransaction = false
                    }
                    Button {
                        text: "Salvar"
                        Layout.fillWidth: true
                        onClicked: {
                            var val = parseFloat(transAmountInput.text)
                            if (transDescInput.text.trim().length > 0 && !isNaN(val)) {
                                var today = Qt.formatDate(new Date(), "yyyy-MM-dd")
                                dataController.addTransaction(transDescInput.text, val, transTypeCombo.currentText, transCategoryInput.text, today)
                                transDescInput.text = ""
                                transAmountInput.text = ""
                                financeRoot.isAddingTransaction = false
                                financeRoot.refreshData()
                            }
                        }
                    }
                }
            }
        }
    }

    // Modal: Adicionar Wishlist
    Rectangle {
        anchors.fill: parent
        color: "#b3000000"
        visible: financeRoot.isAddingWishlistItem

        MouseArea { anchors.fill: parent }

        Rectangle {
            anchors.centerIn: parent
            width: 440
            height: 340
            radius: 16
            color: "#1a1924"
            border.color: "#ffffff1a"

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
                        onClicked: financeRoot.isAddingWishlistItem = false
                    }
                    Button {
                        text: "Salvar"
                        Layout.fillWidth: true
                        onClicked: {
                            var price = parseFloat(wishPriceInput.text) || 0
                            if (wishTitleInput.text.trim().length > 0) {
                                dataController.addWishlistItem(wishTitleInput.text, price, wishPriorityCombo.currentText, "Geral", "")
                                wishTitleInput.text = ""
                                wishPriceInput.text = ""
                                financeRoot.isAddingWishlistItem = false
                                financeRoot.refreshData()
                            }
                        }
                    }
                }
            }
        }
    }
}
