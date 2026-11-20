package com.synapse.features.finance.ui

import com.synapse.core.FinanceTransaction
import java.time.YearMonth
import java.time.LocalDate
import java.text.NumberFormat
import java.util.Locale

internal fun visibleTransactions(state: FinanceUiState, transactions: List<FinanceTransaction>): List<FinanceTransaction> = transactions.asSequence()
    .filter { it.type == "income" || it.type == "expense" || it.type == "transfer" }
    .filter { state.selectedAccountId == FinanceViewModel.ALL_ACCOUNTS || it.accountId == state.selectedAccountId || it.destinationAccountId == state.selectedAccountId }
    .filter { state.allHistory || it.date.startsWith(state.selectedPeriod.toString()) }
    .toList()

internal fun financeTransactions(state: FinanceUiState): List<FinanceTransaction> = state.transactions.filter { transaction ->
    state.selectedAccountId == FinanceViewModel.ALL_ACCOUNTS ||
        transaction.accountId == state.selectedAccountId ||
        transaction.destinationAccountId == state.selectedAccountId
}

internal fun isPendingCashflow(transaction: FinanceTransaction): Boolean =
    (transaction.type == "income" || transaction.type == "expense" || transaction.type == "transfer") &&
        (transaction.isPaid == 0 || transaction.status == "pending")

internal fun currency(amount: Double): String = NumberFormat.getCurrencyInstance(Locale("pt", "BR")).format(amount)

internal fun periodLabel(period: YearMonth): String =
    "${period.month.getDisplayName(java.time.format.TextStyle.FULL, Locale("pt", "BR")).replaceFirstChar { it.uppercase() }} ${period.year}"

internal fun isValidDate(value: String): Boolean = runCatching { LocalDate.parse(value.trim()) }.isSuccess
