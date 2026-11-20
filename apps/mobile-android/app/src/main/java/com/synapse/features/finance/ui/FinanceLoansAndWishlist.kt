package com.synapse.features.finance.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.core.FinanceAccount
import com.synapse.core.FinanceTransaction
import com.synapse.core.FinanceWishlistItem
import com.synapse.ui.theme.*
import java.time.LocalDate
import java.util.Locale

@Composable
fun FinanceLoansSection(state: FinanceUiState, viewModel: FinanceViewModel) {
    var payingLoan by remember { mutableStateOf<FinanceTransaction?>(null) }
    var deleteTarget by remember { mutableStateOf<FinanceTransaction?>(null) }
    var reopenTarget by remember { mutableStateOf<FinanceTransaction?>(null) }
    var query by remember { mutableStateOf("") }
    var directionFilter by remember { mutableStateOf("all") }
    var statusFilter by remember { mutableStateOf("all") }
    val loans = state.transactions.filter { it.type == "loan_made" || it.type == "loan_taken" }
        .filter { state.selectedAccountId == FinanceViewModel.ALL_ACCOUNTS || it.accountId == state.selectedAccountId }
    val visibleLoans = loans.filter { loan ->
        val isCompleted = isCompletedLoan(loan)
        val isOverdue = isLoanOverdue(loan)
        val matchesDirection = directionFilter == "all" || loan.type == directionFilter
        val matchesStatus = when (statusFilter) {
            "active" -> !isCompleted
            "overdue" -> isOverdue
            "completed" -> isCompleted
            else -> true
        }
        val matchesQuery = loan.description.contains(query, true) || loan.person.orEmpty().contains(query, true) || loan.category.contains(query, true)
        matchesDirection && matchesStatus && matchesQuery
    }

    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 92.dp)) {
        item {
            LoanSummary(loans)
            OutlinedTextField(query, { query = it }, label = { Text("Buscar empréstimo ou pessoa") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            LoanFilterRow(
                listOf("all" to "Todos", "loan_made" to "A receber", "loan_taken" to "A pagar"),
                directionFilter,
            ) { directionFilter = it }
            LoanFilterRow(
                listOf("all" to "Todos status", "active" to "Ativos", "overdue" to "Vencidos", "completed" to "Quitados"),
                statusFilter,
            ) { statusFilter = it }
        }
        if (visibleLoans.isEmpty()) item { EmptyFinanceState("Nenhum empréstimo corresponde aos filtros.") }
        items(visibleLoans, key = { it.id }) { loan ->
            LoanCard(loan,
                onPay = { payingLoan = loan },
                onSettle = { accountId -> viewModel.recordLoanPayment(loan.id, null, accountId, LocalDate.now().toString()) },
                onReopen = { reopenTarget = loan },
                onEdit = viewModel::editTransaction,
                onDelete = { deleteTarget = loan },
                accounts = state.accounts,
                payments = state.transactions.filter { it.linkedLoanId == loan.id },
            )
        }
    }
    payingLoan?.let { loan -> LoanPaymentDialog(loan, state.accounts, state.saving, { payingLoan = null }) { amount, accountId, date ->
        viewModel.recordLoanPayment(loan.id, amount, accountId, date); payingLoan = null
    } }
    deleteTarget?.let { loan -> ConfirmFinanceAction("Excluir empréstimo?", "O empréstimo e os pagamentos vinculados serão arquivados.", { deleteTarget = null }) {
        viewModel.deleteTransaction(loan.id); deleteTarget = null
    } }
    reopenTarget?.let { loan -> ConfirmFinanceAction(
        "Reabrir empréstimo?",
        "Os pagamentos vinculados serão arquivados e o empréstimo voltará ao saldo pendente.",
        { reopenTarget = null },
    ) {
        viewModel.reopenLoan(loan.id)
        reopenTarget = null
    } }
}
@Composable
private fun LoanCard(
    loan: FinanceTransaction,
    accounts: List<FinanceAccount>,
    onPay: () -> Unit,
    onSettle: (String) -> Unit,
    onReopen: () -> Unit,
    onEdit: (FinanceTransaction) -> Unit,
    onDelete: () -> Unit,
    payments: List<FinanceTransaction>,
) {
    var paymentsExpanded by remember(loan.id) { mutableStateOf(false) }
    val target = loan.expectedAmount ?: loan.amount
    val paid = loan.paidAmount ?: 0.0
    val completed = isCompletedLoan(loan)
    val personType = if (loan.type == "loan_made") "A receber" else "A pagar"
    val dueLabel = loan.dueDate?.take(10)?.let { date ->
        runCatching { LocalDate.parse(date) }.getOrNull()?.let { parsed ->
            if (isLoanOverdue(loan)) "Vencido em ${parsed.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale("pt", "BR")))}"
            else "Vence ${parsed.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale("pt", "BR")))}"
        }
    } ?: "Sem vencimento"
    Surface(color = DarkSurface, shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, if (completed) DarkBorder else AmberWarning.copy(alpha = .28f))) {
        Column(Modifier.fillMaxWidth().padding(15.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(loan.person?.takeIf(String::isNotBlank) ?: loan.description, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                    Text("$personType · ${loan.description} · $dueLabel", color = if (isLoanOverdue(loan)) IncorrectRoseText else TextSecondary, fontSize = 11.sp)
                }
                Text(if (completed) "Quitado" else "Em andamento", color = if (completed) CorrectEmeraldText else AmberWarningText, fontSize = 11.sp)
            }
            LinearProgressIndicator(progress = { if (target <= 0.0) 0f else (paid / target).toFloat().coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth(), color = BrandIndigoLight, trackColor = DarkCanvas)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Pago ${currency(paid)}", color = TextSecondary, fontSize = 11.sp)
                Text("Total ${currency(target)}", color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
            }
            if (payments.isNotEmpty()) {
                TextButton(onClick = { paymentsExpanded = !paymentsExpanded }) {
                    Text("${if (paymentsExpanded) "Ocultar" else "Ver"} pagamentos (${payments.size})", color = TextSecondary, fontSize = 11.sp)
                }
                if (paymentsExpanded) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        payments.sortedBy { it.date }.forEach { payment ->
                            val accountName = accounts.firstOrNull { it.id == payment.accountId }?.name.orEmpty()
                            Text("${payment.date} · ${accountName.ifBlank { "Conta arquivada" }} · ${currency(payment.amount)}", color = TextMuted, fontSize = 10.sp)
                        }
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(5.dp), verticalAlignment = Alignment.CenterVertically) {
                if (!completed) {
                    Button(onClick = onPay, enabled = accounts.isNotEmpty(), colors = ButtonDefaults.buttonColors(containerColor = BrandIndigo)) { Text("Registrar pagamento", fontSize = 10.sp) }
                    Button(onClick = { onSettle(accounts.firstOrNull { it.id == loan.accountId }?.id ?: accounts.firstOrNull()?.id.orEmpty()) }, enabled = accounts.isNotEmpty(), colors = ButtonDefaults.buttonColors(containerColor = CorrectEmerald.copy(alpha = .75f))) { Text("Quitar saldo", fontSize = 10.sp) }
                } else Button(onClick = onReopen, colors = ButtonDefaults.buttonColors(containerColor = DarkCanvas)) { Text("Reabrir", fontSize = 10.sp) }
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { onEdit(loan) }) { Icon(Icons.Default.Edit, "Editar", tint = TextSecondary) }
                IconButton(onClick = onDelete) { Icon(Icons.Default.DeleteOutline, "Excluir", tint = IncorrectRoseText) }
            }
        }
    }
}

@Composable
private fun LoanSummary(loans: List<FinanceTransaction>) {
    val toReceive = loans.filter { it.type == "loan_made" && !isCompletedLoan(it) }
        .sumOf { ((it.expectedAmount ?: it.amount) - (it.paidAmount ?: 0.0)).coerceAtLeast(0.0) }
    val toPay = loans.filter { it.type == "loan_taken" && !isCompletedLoan(it) }
        .sumOf { ((it.expectedAmount ?: it.amount) - (it.paidAmount ?: 0.0)).coerceAtLeast(0.0) }
    val overdue = loans.count(::isLoanOverdue)
    Surface(color = DarkSurface, shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, DarkBorder)) {
        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            LoanSummaryMetric("A receber", currency(toReceive), CorrectEmeraldText, Modifier.weight(1f))
            LoanSummaryMetric("A pagar", currency(toPay), BrandIndigoLight, Modifier.weight(1f))
            LoanSummaryMetric("Vencidos", overdue.toString(), if (overdue > 0) IncorrectRoseText else TextSecondary, Modifier.weight(1f))
        }
    }
}

@Composable
private fun LoanSummaryMetric(label: String, value: String, color: androidx.compose.ui.graphics.Color, modifier: Modifier) {
    Column(modifier) {
        Text(label, color = TextMuted, fontSize = 10.sp)
        Text(value, color = color, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
    }
}

@Composable
private fun LoanFilterRow(options: List<Pair<String, String>>, selected: String, onSelect: (String) -> Unit) {
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        options.forEach { (key, label) ->
            TextButton(
                onClick = { onSelect(key) },
                colors = ButtonDefaults.textButtonColors(contentColor = if (selected == key) BrandIndigoLight else TextSecondary),
            ) { Text(label, fontSize = 11.sp, maxLines = 1) }
        }
    }
}

private fun isCompletedLoan(loan: FinanceTransaction): Boolean {
    val total = loan.expectedAmount ?: loan.amount
    return loan.isPaid == 1 || loan.status == "completed" || (total > 0.0 && (loan.paidAmount ?: 0.0) >= total - 0.005)
}

private fun isLoanOverdue(loan: FinanceTransaction): Boolean {
    if (isCompletedLoan(loan)) return false
    val dueDate = runCatching { LocalDate.parse(loan.dueDate?.take(10).orEmpty()) }.getOrNull() ?: return false
    return dueDate.isBefore(LocalDate.now())
}

@Composable
fun FinanceWishlistSection(state: FinanceUiState, viewModel: FinanceViewModel) {
    var deleteTarget by remember { mutableStateOf<FinanceWishlistItem?>(null) }
    var acquiring by remember { mutableStateOf<FinanceWishlistItem?>(null) }
    if (state.wishlist.isEmpty()) EmptyFinanceState("Sua lista está vazia. Adicione metas e compras planejadas.")
    else LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 92.dp)) {
        items(state.wishlist, key = { it.id }) { item ->
            WishlistCard(item, onEdit = viewModel::editWishlist, onDelete = { deleteTarget = item }, onAcquire = { acquiring = item })
        }
    }
    deleteTarget?.let { item -> ConfirmFinanceAction("Excluir desejo?", "${item.title} será arquivado.", { deleteTarget = null }) {
        viewModel.deleteWishlist(item.id); deleteTarget = null
    } }
    acquiring?.let { item -> AcquireWishlistDialog(item, state.accounts, state.saving, { acquiring = null }) { amount, accountId, date, description, removeFromList ->
        viewModel.acquireWishlist(item, amount, accountId, date, description, removeFromList)
        acquiring = null
    } }
}

@Composable
private fun WishlistCard(item: FinanceWishlistItem, onEdit: (FinanceWishlistItem) -> Unit, onDelete: () -> Unit, onAcquire: () -> Unit) {
    Surface(color = DarkSurface, shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, DarkBorder)) {
        Row(Modifier.fillMaxWidth().padding(13.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Column(Modifier.weight(1f)) {
                Text(item.title, color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Text("${item.category ?: "Geral"} · prioridade ${item.priority}${item.expectedDate?.let { " · $it" } ?: ""}", color = TextMuted, fontSize = 10.sp)
                Text(currency(item.price), color = BrandIndigoLight, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
            Button(onClick = onAcquire, colors = ButtonDefaults.buttonColors(containerColor = CorrectEmerald.copy(alpha = .75f))) { Text("Adquirido", fontSize = 10.sp) }
            IconButton(onClick = { onEdit(item) }) { Icon(Icons.Default.Edit, "Editar", tint = TextSecondary) }
            IconButton(onClick = onDelete) { Icon(Icons.Default.DeleteOutline, "Excluir", tint = IncorrectRoseText) }
        }
    }
}
