package com.synapse.features.finance.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.core.FinanceAccount
import com.synapse.core.FinanceTransaction
import com.synapse.core.FinanceWishlistItem
import com.synapse.ui.theme.*
import java.time.LocalDate

@Composable
fun FinanceDashboard(state: FinanceUiState, viewModel: FinanceViewModel) {
    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 96.dp)) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                SummaryPanel(state)
                Text("Suas contas", color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                state.accounts.forEach { AccountBalanceCard(it) }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { viewModel.editTransaction(null) }, modifier = Modifier.weight(1f), enabled = !state.saving) { Text("Nova transação") }
                    Button(onClick = viewModel::showAccounts, modifier = Modifier.weight(1f)) { Text("Gerenciar contas") }
                }
                Text("Movimentações recentes", color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            }
        }
        val recent = visibleTransactions(state, state.transactions).take(8)
        if (recent.isEmpty()) item { EmptyFinanceState("Ainda não há movimentações nesse período.") }
        items(recent, key = { it.id }) { TransactionCard(it, onEdit = viewModel::editTransaction, onDelete = {}, onConfirmPending = {}, showActions = false) }
    }
}
@Composable
private fun SummaryPanel(state: FinanceUiState) {
    Surface(color = DarkSurface, shape = RoundedCornerShape(18.dp), border = BorderStroke(1.dp, DarkBorder)) {
        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(if (state.selectedAccountId == FinanceViewModel.ALL_ACCOUNTS) "Saldo atual consolidado" else "Saldo atual da conta", color = TextSecondary, fontSize = 12.sp)
            Text(currency(state.summary.totalBalance), color = if (state.summary.totalBalance >= 0) CorrectEmeraldText else IncorrectRoseText, fontSize = 28.sp, fontWeight = FontWeight.Bold)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SummaryAmount("Receitas", state.summary.income, CorrectEmeraldText, Modifier.weight(1f))
                SummaryAmount("Despesas", state.summary.expense, IncorrectRoseText, Modifier.weight(1f))
                SummaryAmount("Resultado", state.summary.balance, TextPrimary, Modifier.weight(1f))
            }
            Text(if (state.allHistory) "Valores do histórico completo" else "Valores de ${periodLabel(state.selectedPeriod)}", color = TextMuted, fontSize = 10.sp)
        }
    }
}

@Composable
private fun SummaryAmount(title: String, amount: Double, tint: Color, modifier: Modifier) {
    Column(modifier) {
        Text(title, color = TextSecondary, fontSize = 10.sp)
        Text(currency(amount), color = tint, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, maxLines = 1)
    }
}

@Composable
private fun AccountBalanceCard(account: FinanceAccount) {
    Surface(color = DarkSurface, shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, DarkBorder)) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f)) {
                Text(account.name, color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text("Saldo inicial ${currency(account.initialBalance ?: 0.0)}", color = TextMuted, fontSize = 11.sp)
            }
            Text(currency(account.currentBalance ?: account.initialBalance ?: 0.0), color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }
    }
}

@Composable
fun FinanceTransactionsSection(state: FinanceUiState, viewModel: FinanceViewModel) {
    var query by remember { mutableStateOf("") }
    var typeFilter by remember { mutableStateOf("all") }
    var deleteTarget by remember { mutableStateOf<FinanceTransaction?>(null) }
    var pendingTarget by remember { mutableStateOf<FinanceTransaction?>(null) }
    val matchingRows = financeTransactions(state)
        .filter { typeFilter == "all" || (typeFilter == "loan" && it.type.startsWith("loan_")) || it.type == typeFilter }
        .filter { transaction ->
            val accountName = state.accounts.firstOrNull { it.id == transaction.accountId }?.name.orEmpty()
            transaction.description.contains(query, true) || transaction.category.contains(query, true) ||
                transaction.person.orEmpty().contains(query, true) || accountName.contains(query, true)
        }
    val pendingRows = matchingRows.filter(::isPendingCashflow)
    val completedRows = matchingRows.filter { transaction ->
        !isPendingCashflow(transaction) && (state.allHistory || transaction.date.startsWith(state.selectedPeriod.toString()))
    }

    Column(Modifier.fillMaxSize()) {
        OutlinedTextField(value = query, onValueChange = { query = it }, label = { Text("Buscar descrição, pessoa ou categoria") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("all" to "Todas", "income" to "Receitas", "expense" to "Despesas", "transfer" to "Transferências", "loan" to "Empréstimos").forEach { (key, label) ->
                Button(onClick = { typeFilter = key }, colors = ButtonDefaults.buttonColors(containerColor = if (typeFilter == key) BrandIndigo else DarkSurface)) { Text(label, fontSize = 10.sp) }
            }
        }
        LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 92.dp)) {
            if (pendingRows.isNotEmpty()) {
                item { Text("Transações futuras / pendentes (${pendingRows.size})", color = AmberWarningText, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp)) }
                items(pendingRows, key = { it.id }) { tx ->
                    TransactionCard(tx, viewModel::editTransaction, { deleteTarget = tx }, { pendingTarget = tx })
                }
            }
            if (completedRows.isNotEmpty()) {
                item { Text(if (state.allHistory) "Histórico" else "Movimentações de ${periodLabel(state.selectedPeriod)}", color = TextPrimary, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp)) }
                items(completedRows, key = { it.id }) { tx ->
                    TransactionCard(tx, viewModel::editTransaction, { deleteTarget = tx }, { pendingTarget = tx })
                }
            }
            if (pendingRows.isEmpty() && completedRows.isEmpty()) {
                item { EmptyFinanceState("Nenhuma transação corresponde aos filtros.") }
            }
        }
    }
    deleteTarget?.let { tx ->
        ConfirmFinanceAction("Excluir transação?", "${tx.description} será arquivada e retirada dos cálculos.", { deleteTarget = null }) {
            viewModel.deleteTransaction(tx.id); deleteTarget = null
        }
    }
    pendingTarget?.let { tx ->
        ConfirmFinanceAction("Confirmar transação?", "${tx.description} passará a afetar o saldo da conta.", { pendingTarget = null }) {
            viewModel.confirmPendingTransaction(tx.id); pendingTarget = null
        }
    }
}

@Composable
private fun TransactionCard(
    transaction: FinanceTransaction,
    onEdit: (FinanceTransaction) -> Unit,
    onDelete: () -> Unit,
    onConfirmPending: () -> Unit,
    showActions: Boolean = true,
) {
    val income = transaction.type == "income"
    val transfer = transaction.type == "transfer"
    Surface(color = DarkSurface, shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, DarkBorder)) {
        Row(Modifier.fillMaxWidth().padding(13.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Surface(shape = RoundedCornerShape(10.dp), color = if (income) CorrectEmeraldBg else if (transfer) BrandIndigo.copy(alpha = .15f) else IncorrectRoseBg, modifier = Modifier.size(38.dp)) {
                androidx.compose.foundation.layout.Box(contentAlignment = Alignment.Center) {
                    Icon(if (income) Icons.Default.ArrowUpward else Icons.Default.ArrowDownward, null, tint = if (income) CorrectEmerald else if (transfer) BrandIndigoLight else IncorrectRose)
                }
            }
            Column(Modifier.weight(1f)) {
                Text(transaction.description, color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, maxLines = 1)
                Text("${transaction.category} · ${transaction.date}${if (transaction.status == "pending") " · Pendente" else ""}", color = TextMuted, fontSize = 10.sp, maxLines = 1)
            }
            Text(currency(transaction.amount), color = if (income) CorrectEmeraldText else TextPrimary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            if (showActions) {
                if (isPendingCashflow(transaction)) {
                    TextButton(onClick = onConfirmPending) { Text("Confirmar", color = CorrectEmeraldText, fontSize = 10.sp) }
                }
                IconButton(onClick = { onEdit(transaction) }) { Icon(Icons.Default.Edit, "Editar", tint = TextSecondary) }
                IconButton(onClick = onDelete) { Icon(Icons.Default.DeleteOutline, "Excluir", tint = IncorrectRoseText) }
            }
        }
    }
}

@Composable
internal fun EmptyFinanceState(message: String) {
    Column(Modifier.fillMaxWidth().padding(vertical = 32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(Icons.Default.Payments, contentDescription = null, tint = TextMuted, modifier = Modifier.size(30.dp))
        Text(message, color = TextSecondary, fontSize = 13.sp, modifier = Modifier.padding(top = 10.dp))
    }
}

@Composable
internal fun ConfirmFinanceAction(title: String, message: String, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, containerColor = DarkSurfaceElevated, title = { Text(title, color = TextPrimary) }, text = { Text(message, color = TextSecondary) },
        confirmButton = { TextButton(onClick = onConfirm) { Text("Confirmar", color = IncorrectRoseText) } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar", color = TextSecondary) } })
}
