package com.synapse.features.finance.ui

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.core.FinanceAccount
import com.synapse.core.FinanceSummary
import com.synapse.core.FinanceTransaction
import com.synapse.core.FinanceWishlistItem
import com.synapse.features.finance.data.FinanceRepository
import com.synapse.features.finance.data.FinanceSnapshot
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.time.YearMonth

private const val ALL_FINANCE_ACCOUNTS = "all"

data class FinanceUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val error: String? = null,
    val accounts: List<FinanceAccount> = emptyList(),
    val transactions: List<FinanceTransaction> = emptyList(),
    val wishlist: List<FinanceWishlistItem> = emptyList(),
    val summary: FinanceSummary = FinanceSummary(0.0, 0.0, 0.0, 0.0),
    val section: FinanceSection = FinanceSection.DASHBOARD,
    val selectedAccountId: String = ALL_FINANCE_ACCOUNTS,
    val selectedPeriod: YearMonth = YearMonth.now(),
    val allHistory: Boolean = false,
    val helpVisible: Boolean = false,
    val accountEditorVisible: Boolean = false,
    val transactionEditorVisible: Boolean = false,
    val transactionEditor: FinanceTransaction? = null,
    val wishlistEditorVisible: Boolean = false,
    val wishlistEditor: FinanceWishlistItem? = null,
)

enum class FinanceSection(val label: String) {
    DASHBOARD("Resumo"), TRANSACTIONS("Transações"), LOANS("Empréstimos"), WISHLIST("Desejos"),
}

class FinanceViewModel(context: Context) : ViewModel() {
    private val repository = FinanceRepository(context)
    private val mutableState = MutableStateFlow(FinanceUiState())
    private var requestGeneration = 0L
    private var mutationGeneration = 0L
    val state: StateFlow<FinanceUiState> = mutableState.asStateFlow()

    init { refresh() }

    fun refresh() {
        if (mutableState.value.saving) return
        val generation = ++requestGeneration
        val current = mutableState.value
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(loading = true, error = null)
            try {
                val snapshot = repository.load(current.selectedAccountId, current.selectedPeriod.takeUnless { current.allHistory })
                if (generation == requestGeneration) {
                    mutableState.value = mutableState.value.copy(
                        loading = false,
                        accounts = snapshot.accounts,
                        transactions = snapshot.transactions,
                        wishlist = snapshot.wishlist,
                        summary = snapshot.summary,
                        selectedAccountId = snapshot.selectedAccountId,
                    )
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (generation == requestGeneration) reportFailure("load finance data", error)
            }
        }
    }

    fun selectSection(section: FinanceSection) = update { copy(section = section) }
    fun selectAccount(id: String) { update { copy(selectedAccountId = id) }; refresh() }
    fun movePeriod(delta: Long) { update { copy(selectedPeriod = selectedPeriod.plusMonths(delta), allHistory = false) }; refresh() }
    fun toggleHistory() { update { copy(allHistory = !allHistory) }; refresh() }
    fun showHelp() = update { copy(helpVisible = true) }
    fun dismissHelp() = update { copy(helpVisible = false) }
    fun showAccounts() = update { copy(accountEditorVisible = true) }
    fun dismissAccounts() = update { copy(accountEditorVisible = false) }
    fun editTransaction(transaction: FinanceTransaction?) = update { copy(transactionEditorVisible = true, transactionEditor = transaction) }
    fun dismissTransactionEditor() = update { copy(transactionEditorVisible = false, transactionEditor = null) }
    fun editWishlist(item: FinanceWishlistItem?) = update { copy(wishlistEditorVisible = true, wishlistEditor = item) }
    fun dismissWishlistEditor() = update { copy(wishlistEditorVisible = false, wishlistEditor = null) }

    fun saveTransaction(transaction: FinanceTransaction) = mutate {
        if (transaction.id.isBlank()) repository.createTransaction(transaction)
        else repository.updateTransaction(transaction)
        update { copy(transactionEditorVisible = false, transactionEditor = null) }
    }

    fun deleteTransaction(id: String) = mutate { repository.deleteTransaction(id) }
    fun confirmPendingTransaction(id: String) = mutate { repository.confirmPendingTransaction(id) }
    fun recordLoanPayment(id: String, amount: Double?, accountId: String, date: String) = mutate {
        repository.recordLoanPayment(id, amount, accountId, date)
    }
    fun reopenLoan(id: String) = mutate { repository.reopenLoan(id) }
    fun saveAccount(account: FinanceAccount) = mutate {
        if (account.id.isBlank()) repository.createAccount(account) else repository.updateAccount(account)
    }
    fun deleteAccount(id: String) = mutate { repository.deleteAccount(id) }
    fun saveWishlist(item: FinanceWishlistItem) = mutate {
        if (item.id.isBlank()) repository.createWishlist(item) else repository.updateWishlist(item)
        update { copy(wishlistEditorVisible = false, wishlistEditor = null) }
    }
    fun deleteWishlist(id: String) = mutate { repository.deleteWishlist(id) }
    fun acquireWishlist(item: FinanceWishlistItem, amount: Double, accountId: String, date: String, description: String, removeFromList: Boolean) = mutate {
        repository.acquireWishlist(item.id, amount, accountId, item.category ?: "Geral", date, description, removeFromList)
        update { copy(wishlistEditorVisible = false, wishlistEditor = null) }
    }

    private fun mutate(operation: suspend () -> Unit) {
        if (mutableState.value.saving) return
        val generation = ++requestGeneration
        val mutation = ++mutationGeneration
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                operation()
                val snapshot = loadCurrentSelection()
                if (generation == requestGeneration && mutation == mutationGeneration) {
                    mutableState.value = mutableState.value.copy(
                        saving = false,
                        accounts = snapshot.accounts,
                        transactions = snapshot.transactions,
                        wishlist = snapshot.wishlist,
                        summary = snapshot.summary,
                        selectedAccountId = snapshot.selectedAccountId,
                    )
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (generation == requestGeneration && mutation == mutationGeneration) {
                    reportFailure("save finance data", error)
                }
            }
        }
    }

    private suspend fun loadCurrentSelection(): FinanceSnapshot {
        while (true) {
            val requested = mutableState.value
            val snapshot = repository.load(
                requested.selectedAccountId,
                requested.selectedPeriod.takeUnless { requested.allHistory },
            )
            val latest = mutableState.value
            if (requested.selectedAccountId == latest.selectedAccountId &&
                requested.selectedPeriod == latest.selectedPeriod &&
                requested.allHistory == latest.allHistory
            ) return snapshot
        }
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(loading = false, saving = false, error = error.message ?: "Erro ao acessar os dados financeiros.")
    }

    private inline fun update(transform: FinanceUiState.() -> FinanceUiState) {
        mutableState.value = mutableState.value.transform()
    }

    override fun onCleared() {
        repository.close()
        super.onCleared()
    }

    companion object {
        const val ALL_ACCOUNTS = ALL_FINANCE_ACCOUNTS
        private const val TAG = "SynapseFinance"
    }
}
