package com.synapse.features.finance.data

import android.content.Context
import com.synapse.data.SynapseDatabase
import com.synapse.core.FinanceAccount
import com.synapse.core.FinanceTransaction
import com.synapse.core.FinanceWishlistItem
import com.synapse.core.FinanceSummary
import com.synapse.core.SynapseFinanceStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.YearMonth

class FinanceRepository(context: Context) : AutoCloseable {
    private val databasePath = SynapseDatabase.path(context)
    private var store: SynapseFinanceStore? = null

    suspend fun load(accountId: String, period: YearMonth?): FinanceSnapshot = withContext(Dispatchers.IO) {
        val nativeStore = store()
        val accounts = nativeStore.getAccounts()
        val resolvedAccountId = accountId.takeIf { id ->
            id == ALL_ACCOUNTS || accounts.any { it.id == id }
        } ?: ALL_ACCOUNTS
        FinanceSnapshot(
            accounts = accounts,
            transactions = nativeStore.getTransactions(null, null),
            wishlist = nativeStore.getWishlist(),
            summary = nativeStore.getSummaryFor(resolvedAccountId.takeUnless { it == ALL_ACCOUNTS }, period?.toString()),
            selectedAccountId = resolvedAccountId,
        )
    }

    suspend fun loadDashboardSummary(period: YearMonth = YearMonth.now()): FinanceSummary =
        withContext(Dispatchers.IO) { store().getSummaryFor(null, period.toString()) }

    suspend fun createAccount(account: FinanceAccount): FinanceAccount = ioStore { it.createAccount(account) }
    suspend fun updateAccount(account: FinanceAccount): FinanceAccount = ioStore { it.updateAccount(account) }
    suspend fun deleteAccount(id: String): Boolean = ioStore { it.deleteAccount(id) }
    suspend fun createTransaction(transaction: FinanceTransaction): FinanceTransaction = ioStore { it.createTransaction(transaction) }
    suspend fun updateTransaction(transaction: FinanceTransaction): FinanceTransaction = ioStore { it.updateTransaction(transaction) }
    suspend fun deleteTransaction(id: String): Boolean = ioStore { it.deleteTransaction(id) }
    suspend fun confirmPendingTransaction(id: String) = ioStore { it.confirmPendingTransaction(id) }
    suspend fun recordLoanPayment(loanId: String, amount: Double?, accountId: String, date: String): FinanceTransaction =
        ioStore { it.recordLoanPayment(loanId, amount, accountId, date) }
    suspend fun reopenLoan(loanId: String) = ioStore { it.reopenLoan(loanId) }
    suspend fun createWishlist(item: FinanceWishlistItem): FinanceWishlistItem = ioStore { it.createWishlistItem(item) }
    suspend fun updateWishlist(item: FinanceWishlistItem): FinanceWishlistItem = ioStore { it.updateWishlistItem(item) }
    suspend fun deleteWishlist(id: String): Boolean = ioStore { it.deleteWishlistItem(id) }
    suspend fun acquireWishlist(id: String, amount: Double, accountId: String, category: String, date: String, description: String, removeFromList: Boolean) =
        ioStore { it.acquireWishlistItem(id, description, amount, accountId, category, date, removeFromList) }

    private suspend fun <T> ioStore(operation: (SynapseFinanceStore) -> T): T = withContext(Dispatchers.IO) {
        operation(store())
    }

    @Synchronized
    private fun store(): SynapseFinanceStore {
        return store ?: SynapseFinanceStore.open(databasePath).also { store = it }
    }

    @Synchronized
    override fun close() {
        store?.close()
        store = null
    }

    companion object {
        private const val ALL_ACCOUNTS = "all"
    }
}

data class FinanceSnapshot(
    val accounts: List<FinanceAccount>,
    val transactions: List<FinanceTransaction>,
    val wishlist: List<FinanceWishlistItem>,
    val summary: com.synapse.core.FinanceSummary,
    val selectedAccountId: String,
)
