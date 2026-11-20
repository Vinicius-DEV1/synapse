package com.synapse.features.finance.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.synapse.core.FinanceAccount
import com.synapse.core.FinanceTransaction
import com.synapse.core.FinanceWishlistItem
import com.synapse.ui.theme.*
import java.time.LocalDate

@Composable
fun LoanPaymentDialog(
    loan: FinanceTransaction,
    accounts: List<FinanceAccount>,
    saving: Boolean,
    onDismiss: () -> Unit,
    onPay: (Double, String, String) -> Unit,
) {
    var amountText by remember(loan.id) { mutableStateOf("") }
    var accountId by remember(loan.id, accounts) {
        mutableStateOf(accounts.firstOrNull { it.id == loan.accountId }?.id ?: accounts.firstOrNull()?.id.orEmpty())
    }
    var paymentDate by remember(loan.id) { mutableStateOf(LocalDate.now().toString()) }
    var error by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = onDismiss, containerColor = DarkSurfaceElevated,
        title = { Text(if (loan.type == "loan_made") "Registrar recebimento" else "Registrar pagamento", color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("${loan.person ?: loan.description} · vence ${loan.dueDate ?: "sem data definida"}", color = TextSecondary)
                FinanceTextField(amountText, { amountText = it }, "Valor recebido/pago", keyboardType = KeyboardType.Decimal)
                FinanceDateField(paymentDate, { paymentDate = it }, "Data do pagamento")
                AccountChoice("Conta", accounts, accountId) { accountId = it }
                error?.let { Text(it, color = IncorrectRoseText) }
            }
        },
        confirmButton = { Button(enabled = !saving, onClick = {
            val amount = amountText.toMoney()
            if (amount == null || !amount.isFinite() || amount <= 0.0 || accountId.isBlank() || !isValidDate(paymentDate)) { error = "Informe valor, data e conta válidos."; return@Button }
            onPay(amount, accountId, paymentDate)
        }) { Text(if (saving) "Registrando…" else "Registrar") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar", color = TextSecondary) } },
    )
}

@Composable
fun AcquireWishlistDialog(
    item: FinanceWishlistItem,
    accounts: List<FinanceAccount>,
    saving: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (Double, String, String, String, Boolean) -> Unit,
) {
    var amountText by remember(item.id) { mutableStateOf(item.price.toString()) }
    var description by remember(item.id) { mutableStateOf(item.title) }
    var date by remember(item.id) { mutableStateOf(LocalDate.now().toString()) }
    var accountId by remember(item.id) { mutableStateOf(accounts.firstOrNull()?.id.orEmpty()) }
    var removeWish by remember(item.id) { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = onDismiss, containerColor = DarkSurfaceElevated,
        title = { Text("Registrar aquisição", color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                FinanceTextField(description, { description = it }, "Descrição da despesa")
                FinanceTextField(amountText, { amountText = it }, "Valor efetivamente pago", keyboardType = KeyboardType.Decimal)
                FinanceDateField(date, { date = it }, "Data")
                AccountChoice("Conta debitada", accounts, accountId) { accountId = it }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(removeWish, { removeWish = it })
                    Text("Remover da lista de desejos", color = TextSecondary)
                }
                error?.let { Text(it, color = IncorrectRoseText) }
            }
        },
        confirmButton = { Button(enabled = !saving, onClick = {
            val amount = amountText.toMoney()
            if (amount == null || !amount.isFinite() || amount <= 0.0 || description.isBlank() || accountId.isBlank() || !isValidDate(date)) { error = "Revise descrição, valor, data e conta."; return@Button }
            onConfirm(amount, accountId, date, description.trim(), removeWish)
        }) { Text("Registrar despesa") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar", color = TextSecondary) } },
    )
}
