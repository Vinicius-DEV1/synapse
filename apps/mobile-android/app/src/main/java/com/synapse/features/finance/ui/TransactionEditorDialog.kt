package com.synapse.features.finance.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.synapse.core.FinanceAccount
import com.synapse.core.FinanceTransaction
import com.synapse.ui.theme.*
import java.time.LocalDate

private val transactionTypes = listOf(
    "expense" to "Despesa", "income" to "Receita", "transfer" to "Transferência",
    "loan_made" to "Emprestei", "loan_taken" to "Peguei emprestado",
)

@Composable
fun TransactionEditorDialog(
    transaction: FinanceTransaction?,
    accounts: List<FinanceAccount>,
    saving: Boolean,
    onDismiss: () -> Unit,
    onSave: (FinanceTransaction) -> Unit,
) {
    var type by remember(transaction?.id) { mutableStateOf(transaction?.type ?: "expense") }
    var description by remember(transaction?.id) { mutableStateOf(transaction?.description.orEmpty()) }
    var amount by remember(transaction?.id) { mutableStateOf(transaction?.amount?.toString().orEmpty()) }
    var expected by remember(transaction?.id) { mutableStateOf(transaction?.expectedAmount?.toString().orEmpty()) }
    var category by remember(transaction?.id) { mutableStateOf(transaction?.category?.ifBlank { "Geral" } ?: "Geral") }
    var date by remember(transaction?.id) { mutableStateOf(transaction?.date?.take(10) ?: LocalDate.now().toString()) }
    var dueDate by remember(transaction?.id) { mutableStateOf(transaction?.dueDate.orEmpty()) }
    var person by remember(transaction?.id) { mutableStateOf(transaction?.person.orEmpty()) }
    var accountId by remember(transaction?.id, accounts) { mutableStateOf(transaction?.accountId ?: accounts.firstOrNull()?.id.orEmpty()) }
    var destinationId by remember(transaction?.id, accounts) { mutableStateOf(transaction?.destinationAccountId ?: accounts.firstOrNull { it.id != accountId }?.id.orEmpty()) }
    var pending by remember(transaction?.id) { mutableStateOf(transaction?.status == "pending" || transaction?.isPaid == 0 && !isLoan(type)) }
    var validationError by remember { mutableStateOf<String?>(null) }
    val loan = isLoan(type)
    val transfer = type == "transfer"

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurfaceElevated,
        title = { Text(if (transaction == null) "Novo registro financeiro" else "Editar registro", color = TextPrimary) },
        text = {
            Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    transactionTypes.forEach { (key, label) ->
                        Button(onClick = { type = key }, colors = ButtonDefaults.buttonColors(containerColor = if (type == key) BrandIndigo else DarkSurface)) { Text(label, maxLines = 1) }
                    }
                }
                FinanceTextField(description, { description = it }, if (loan) "Descrição ou finalidade" else "Descrição", "Ex.: salário, aluguel, compra")
                FinanceTextField(amount, { amount = it }, if (loan) "Valor principal (R$)" else "Valor (R$)", "0,00", KeyboardType.Decimal)
                if (loan) FinanceTextField(expected, { expected = it }, "Valor total previsto (R$)", "Inclua juros, se houver", KeyboardType.Decimal)
                if (loan) FinanceTextField(person, { person = it }, "Pessoa", "Nome da pessoa")
                if (!transfer) FinanceTextField(category, { category = it }, "Categoria", "Geral")
                FinanceDateField(date, { date = it }, "Data")
                if (loan) FinanceDateField(dueDate, { dueDate = it }, "Vencimento (opcional)", optional = true)
                AccountChoice("Conta", accounts, accountId) { accountId = it }
                if (transfer) AccountChoice("Conta de destino", accounts.filter { it.id != accountId }, destinationId) { destinationId = it }
                if (!loan) Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                    Checkbox(checked = pending, onCheckedChange = { pending = it })
                    Text("Marcar como pendente", color = TextSecondary)
                }
                validationError?.let { Text(it, color = IncorrectRoseText) }
            }
        },
        confirmButton = {
            Button(enabled = !saving, onClick = {
                val parsedAmount = amount.toMoney()
                val amountValue = parsedAmount ?: 0.0
                val parsedExpected = expected.takeIf(String::isNotBlank)?.toMoney()
                val finalDescription = description.trim().ifEmpty { person.trim() }
                val error = when {
                    parsedAmount == null || !parsedAmount.isFinite() || amountValue <= 0.0 -> "Informe um valor válido maior que zero."
                    finalDescription.isBlank() -> "Informe uma descrição."
                    !isValidDate(date) -> "Informe uma data válida no formato AAAA-MM-DD."
                    dueDate.isNotBlank() && !isValidDate(dueDate) -> "Informe uma data de vencimento válida."
                    accountId.isBlank() -> "Cadastre uma conta antes de continuar."
                    loan && expected.isNotBlank() && (parsedExpected == null || !parsedExpected.isFinite() || parsedExpected < amountValue) -> "O valor total deve ser igual ou maior que o principal."
                    transfer && (destinationId.isBlank() || destinationId == accountId) -> "Escolha duas contas diferentes para a transferência."
                    else -> null
                }
                if (error != null) { validationError = error; return@Button }
                val isPaid = if (loan) transaction?.isPaid ?: 0 else if (pending) 0 else 1
                val status = if (loan) transaction?.status ?: "in_progress" else if (pending) "pending" else "completed"
                onSave(
                    FinanceTransaction(
                        id = transaction?.id.orEmpty(), description = finalDescription,
                        amount = amountValue, expectedAmount = if (loan) parsedExpected else null,
                        type = type, category = if (transfer) "Transferência" else category.trim().ifEmpty { "Geral" },
                        date = date.trim(), status = status, isPaid = isPaid,
                        paidAmount = transaction?.paidAmount ?: 0.0, isRecurring = transaction?.isRecurring ?: 0,
                        recurrencePeriod = transaction?.recurrencePeriod, dueDate = dueDate.trim().ifEmpty { null },
                        accountId = accountId, destinationAccountId = if (transfer) destinationId else null,
                        linkedLoanId = transaction?.linkedLoanId, person = person.trim().ifEmpty { null },
                        createdAt = transaction?.createdAt, updatedAt = transaction?.updatedAt,
                    ),
                )
            }) { Text(if (saving) "Salvando…" else "Salvar") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar", color = TextSecondary) } },
    )
}

@Composable
internal fun FinanceTextField(value: String, onValueChange: (String) -> Unit, label: String, placeholder: String = "", keyboardType: KeyboardType = KeyboardType.Text) {
    OutlinedTextField(value, onValueChange, label = { Text(label) }, placeholder = { Text(placeholder, color = TextMuted) }, singleLine = true, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = keyboardType))
}

@Composable
internal fun AccountChoice(label: String, accounts: List<FinanceAccount>, selectedId: String, onSelect: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(label, color = TextSecondary)
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            accounts.forEach { account ->
                Button(onClick = { onSelect(account.id) }, colors = ButtonDefaults.buttonColors(containerColor = if (selectedId == account.id) BrandIndigo else DarkSurface)) { Text(account.name, maxLines = 1) }
            }
        }
    }
}

internal fun String.toMoney(): Double? {
    val value = trim().replace(" ", "")
    val brazilianFormat = Regex("[+-]?(?:\\d+|\\d{1,3}(?:\\.\\d{3})+)(?:,\\d{1,2})?")
    val invariantFormat = Regex("[+-]?\\d+(?:\\.\\d{1,2})?")
    val normalized = when {
        brazilianFormat.matches(value) -> value.replace(".", "").replace(',', '.')
        invariantFormat.matches(value) -> value
        else -> return null
    }
    return normalized.toDoubleOrNull()?.takeIf(Double::isFinite)
}
private fun isLoan(type: String) = type == "loan_made" || type == "loan_taken"
