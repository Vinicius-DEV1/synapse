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
    property string transactionTypeFilter: "all" // "all", "income", "expense"
    property string transactionSearch: ""
    property bool isAddingTransaction: false
    property bool isAddingWishlistItem: false
    property var editingTransaction: null

    function refreshData() {
        summary = dataController.getFinancialSummary()
        transactions = dataController.getTransactions()
        wishlistItems = dataController.getWishlist()
    }

    function filteredTransactions() {
        var query = transactionSearch.trim().toLowerCase()
        var res = []
        for (var i = 0; i < transactions.length; i++) {
            var tx = transactions[i]
            var matchType = true
            if (transactionTypeFilter === "income") matchType = (tx.type === "income")
            else if (transactionTypeFilter === "expense") matchType = (tx.type === "expense")

            var matchSearch = true
            if (query.length > 0) {
                var desc = (tx.description || "").toLowerCase()
                var cat = (tx.category || "").toLowerCase()
                matchSearch = (desc.indexOf(query) !== -1 || cat.indexOf(query) !== -1)
            }

            if (matchType && matchSearch) {
                res.push(tx)
            }
        }
        return res
    }

    Component.onCompleted: {
        refreshData()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        // Header and Action Buttons
        FinanceHeaderSection {
            transactionsCount: financeRoot.transactions.length
            wishlistCount: financeRoot.wishlistItems.length
            activeSubTab: financeRoot.activeSubTab
            transactionTypeFilter: financeRoot.transactionTypeFilter
            transactionSearch: financeRoot.transactionSearch

            onNewTransactionRequested: financeRoot.isAddingTransaction = true
            onNewWishlistRequested: financeRoot.isAddingWishlistItem = true
            onSubTabSelected: function(tab) { financeRoot.activeSubTab = tab }
            onTypeFilterSelected: function(type) { financeRoot.transactionTypeFilter = type }
            onSearchChanged: function(search) { financeRoot.transactionSearch = search }
        }

        // 3 Summary Cards (Receitas, Despesas, Saldo Líquido)
        FinanceKpiCards {
            summary: financeRoot.summary
        }

        // Main List Area
        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: financeRoot.activeSubTab === "transactions" ? 0 : 1

            // 1. Transactions List
            TransactionsTable {
                transactions: financeRoot.filteredTransactions()
                onEditRequested: function(transaction) {
                    financeRoot.editingTransaction = transaction
                    financeRoot.isAddingTransaction = true
                }
                onDeleteRequested: function(txId) {
                    dataController.deleteTransaction(txId)
                    financeRoot.refreshData()
                }
            }

            // 2. Wishlist List
            WishlistGrid {
                wishlistItems: financeRoot.wishlistItems
                onAcquiredRequested: function(item) {
                    var today = Qt.formatDate(new Date(), "yyyy-MM-dd")
                    dataController.addTransaction(item.title, item.price, "expense", item.category || "Wishlist", today)
                    dataController.deleteWishlistItem(item.id)
                    financeRoot.refreshData()
                }
                onDeleteRequested: function(itemId) {
                    dataController.deleteWishlistItem(itemId)
                    financeRoot.refreshData()
                }
            }
        }
    }

    // Modal: Adicionar Transação
    CreateTransactionModal {
        id: transactionModal
        visible: financeRoot.isAddingTransaction
        initialTransaction: financeRoot.editingTransaction
        onClosed: {
            financeRoot.isAddingTransaction = false
            financeRoot.editingTransaction = null
        }
        onTransactionSubmitted: function(desc, amount, type, cat) {
            var today = Qt.formatDate(new Date(), "yyyy-MM-dd")
            var saved = financeRoot.editingTransaction
                ? dataController.updateTransaction(financeRoot.editingTransaction.id, desc, amount, type, cat)
                : dataController.addTransaction(desc, amount, type, cat, today)
            if (!saved) {
                transactionModal.errorMessage = qsTr("The transaction could not be saved. Check the fields and try again.")
                return
            }
            financeRoot.isAddingTransaction = false
            financeRoot.editingTransaction = null
            financeRoot.refreshData()
        }
    }

    // Modal: Adicionar Wishlist
    CreateWishlistModal {
        visible: financeRoot.isAddingWishlistItem
        onClosed: financeRoot.isAddingWishlistItem = false
        onWishlistSubmitted: function(title, price, priority) {
            dataController.addWishlistItem(title, price, priority, "Geral", "")
            financeRoot.isAddingWishlistItem = false
            financeRoot.refreshData()
        }
    }
}
