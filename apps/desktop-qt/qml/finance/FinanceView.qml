import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: financeRoot
    color: "#0f0e17" // bg-dark-bg

    property var summary: ({ income: 0, expense: 0, balance: 0, total_balance: 0 })
    property var accounts: []
    property var transactions: []
    property var wishlistItems: []
    property string activeSubTab: "transactions" // "transactions", "wishlist"
    property string transactionTypeFilter: "all" // "all", "income", "expense"
    property string selectedAccountId: "all"
    property string transactionSearch: ""
    property bool isAddingTransaction: false
    property bool isAddingWishlistItem: false
    property bool isAccountManagerOpen: false
    property bool isFinanceHelpOpen: false
    property var editingTransaction: null

    function refreshData() {
        summary = dataController.getFinancialSummary()
        accounts = dataController.getAccounts()
        transactions = dataController.getTransactions(transactionTypeFilter, selectedAccountId)
        wishlistItems = dataController.getWishlist()
    }

    function filteredTransactions() {
        var query = transactionSearch.trim().toLowerCase()
        if (query.length === 0) return transactions
        var res = []
        for (var i = 0; i < transactions.length; i++) {
            var tx = transactions[i]
            var desc = (tx.description || "").toLowerCase()
            var cat = (tx.category || "").toLowerCase()
            if (desc.indexOf(query) !== -1 || cat.indexOf(query) !== -1) {
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
        spacing: 20

        // Header and Action Buttons
        FinanceHeaderSection {
            transactionsCount: financeRoot.transactions.length
            wishlistCount: financeRoot.wishlistItems.length
            activeSubTab: financeRoot.activeSubTab
            transactionTypeFilter: financeRoot.transactionTypeFilter
            transactionSearch: financeRoot.transactionSearch

            onNewTransactionRequested: {
                financeRoot.editingTransaction = null
                financeRoot.isAddingTransaction = true
            }
            onNewWishlistRequested: financeRoot.isAddingWishlistItem = true
            onHelpRequested: financeRoot.isFinanceHelpOpen = true
            onSubTabSelected: function(tab) { financeRoot.activeSubTab = tab }
            onTypeFilterSelected: function(type) {
                financeRoot.transactionTypeFilter = type
                financeRoot.refreshData()
            }
            onSearchChanged: function(search) { financeRoot.transactionSearch = search }
        }

        // Horizontal Account Strip with Balances & Manage Button
        AccountCards {
            accounts: financeRoot.accounts
            selectedAccountId: financeRoot.selectedAccountId
            totalBalance: Number(financeRoot.summary.total_balance || 0)
            onSelectAccountRequested: function(accId) {
                financeRoot.selectedAccountId = accId
                financeRoot.refreshData()
            }
            onManageAccountsRequested: financeRoot.isAccountManagerOpen = true
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
                accounts: financeRoot.accounts
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

    // Modal: Adicionar / Editar Transação
    CreateTransactionModal {
        id: transactionModal
        isOpen: financeRoot.isAddingTransaction
        accounts: financeRoot.accounts
        initialTransaction: financeRoot.editingTransaction
        onClosed: {
            financeRoot.isAddingTransaction = false
            financeRoot.editingTransaction = null
        }
        onTransactionSubmitted: function(desc, amount, type, cat, date, accId, destId) {
            var saved = false
            if (type === "transfer") {
                saved = dataController.addTransfer(desc, amount, accId, destId, date)
            } else if (financeRoot.editingTransaction) {
                saved = dataController.updateTransaction(
                    financeRoot.editingTransaction.id,
                    desc,
                    amount,
                    type,
                    cat,
                    date,
                    accId,
                    destId
                )
            } else {
                saved = dataController.addTransaction(desc, amount, type, cat, date, accId)
            }

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

    // Modal: Gerenciar Contas Bancárias
    AccountManagerModal {
        isOpen: financeRoot.isAccountManagerOpen
        accounts: financeRoot.accounts
        onClosed: financeRoot.isAccountManagerOpen = false
        onAccountCreated: function(name, color, icon, initialBal) {
            if (dataController.createAccount(name, color, icon, initialBal)) {
                financeRoot.refreshData()
            }
        }
        onAccountUpdated: function(accId, name, color, icon, initialBal) {
            if (dataController.updateAccount(accId, name, color, icon, initialBal)) {
                financeRoot.refreshData()
            }
        }
        onAccountDeleted: function(accId) {
            if (dataController.deleteAccount(accId)) {
                if (financeRoot.selectedAccountId === accId) {
                    financeRoot.selectedAccountId = "all"
                }
                financeRoot.refreshData()
            }
        }
    }

    // Modal: Guia de Finanças
    FinanceHelpDialog {
        isOpen: financeRoot.isFinanceHelpOpen
        onClosed: financeRoot.isFinanceHelpOpen = false
    }
}
