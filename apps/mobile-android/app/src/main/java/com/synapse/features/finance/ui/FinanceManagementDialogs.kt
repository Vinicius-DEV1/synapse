package com.synapse.features.finance.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.core.FinanceAccount
import com.synapse.core.FinanceWishlistItem
import com.synapse.ui.theme.*
import java.time.LocalDate

@Composable
fun AccountManagerDialog(state: FinanceUiState, viewModel: FinanceViewModel) {
    var editing by remember { mutableStateOf<FinanceAccount?>(null) }
    var creating by remember { mutableStateOf(false) }
    var deleteTarget by remember { mutableStateOf<FinanceAccount?>(null) }
    var name by remember(editing?.id, creating) { mutableStateOf(editing?.name.orEmpty()) }
    var color by remember(editing?.id, creating) { mutableStateOf(editing?.color ?: ACCOUNT_COLORS.first()) }
    var initialBalance by remember(editing?.id, creating) { mutableStateOf(editing?.initialBalance?.toString().orEmpty()) }
    var validationError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = viewModel::dismissAccounts,
        containerColor = DarkSurfaceElevated,
        title = { Text("Contas e bancos", color = TextPrimary) },
        text = {
            Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                state.accounts.forEach { account ->
                    Surface(color = DarkSurface, shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp), border = BorderStroke(1.dp, DarkBorder)) {
                        Row(Modifier.fillMaxWidth().padding(11.dp), verticalAlignment = Alignment.CenterVertically) {
                            Surface(color = account.color?.toColor() ?: CorrectEmerald, shape = CircleShape, modifier = Modifier.padding(end = 10.dp).padding(4.dp)) { Text(" ", modifier = Modifier.padding(5.dp)) }
                            Column(Modifier.weight(1f)) {
                                Text(account.name, color = TextPrimary)
                                Text("Inicial ${currency(account.initialBalance ?: 0.0)} · Atual ${currency(account.currentBalance ?: 0.0)}", color = TextMuted, fontSize = 10.sp)
                            }
                            TextButton(onClick = { editing = account; creating = false }) { Icon(Icons.Default.Edit, "Editar", tint = BrandIndigoLight) }
                            TextButton(enabled = state.accounts.size > 1 && !state.saving, onClick = { deleteTarget = account }) { Icon(Icons.Default.Archive, "Arquivar", tint = IncorrectRoseText) }
                        }
                    }
                }
                if (creating || editing != null) {
                    Text(if (creating) "Nova conta" else "Editar conta", color = TextPrimary)
                    OutlinedTextField(name, { name = it }, label = { Text("Nome") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(initialBalance, { initialBalance = it }, label = { Text("Saldo inicial") }, singleLine = true, modifier = Modifier.fillMaxWidth(), keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Decimal))
                    Text("Cor da conta", color = TextSecondary, fontSize = 12.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        ACCOUNT_COLORS.forEach { value ->
                            Surface(
                                color = value.toColor() ?: CorrectEmerald,
                                shape = CircleShape,
                                border = BorderStroke(if (color == value) 2.dp else 0.dp, Color.White),
                                modifier = Modifier.clickable { color = value }.padding(2.dp),
                            ) { Text("  ", modifier = Modifier.padding(7.dp)) }
                        }
                    }
                    validationError?.let { Text(it, color = IncorrectRoseText) }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Button(onClick = {
                            val parsed = initialBalance.toMoney() ?: 0.0
                            if (name.isBlank() || !parsed.isFinite() || (initialBalance.isNotBlank() && initialBalance.toMoney() == null)) { validationError = "Informe nome e saldo válidos."; return@Button }
                            val account = FinanceAccount(editing?.id.orEmpty(), name.trim(), color, editing?.icon ?: "wallet", parsed, editing?.currentBalance,
                                editing?.createdAt, editing?.updatedAt, editing?.deletedAt)
                            viewModel.saveAccount(account)
                            editing = null; creating = false; validationError = null
                        }, enabled = !state.saving) { Text("Salvar") }
                        TextButton(onClick = { editing = null; creating = false; validationError = null }) { Text("Cancelar", color = TextSecondary) }
                    }
                } else {
                    Button(onClick = { editing = null; creating = true }) { Text("+ Nova conta") }
                }
            }
        },
        confirmButton = { TextButton(onClick = viewModel::dismissAccounts) { Text("Fechar", color = TextSecondary) } },
    )

    deleteTarget?.let { account ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null }, containerColor = DarkSurfaceElevated,
            title = { Text("Arquivar conta?", color = TextPrimary) },
            text = { Text("${account.name} deixará de aparecer em novas transações. O histórico será preservado.", color = TextSecondary) },
            confirmButton = { TextButton(onClick = { viewModel.deleteAccount(account.id); deleteTarget = null }) { Text("Arquivar", color = IncorrectRoseText) } },
            dismissButton = { TextButton(onClick = { deleteTarget = null }) { Text("Cancelar", color = TextSecondary) } },
        )
    }
}

@Composable
fun WishlistEditorDialog(item: FinanceWishlistItem?, saving: Boolean, onDismiss: () -> Unit, onSave: (FinanceWishlistItem) -> Unit) {
    var title by remember(item?.id) { mutableStateOf(item?.title.orEmpty()) }
    var price by remember(item?.id) { mutableStateOf(item?.price?.toString().orEmpty()) }
    var category by remember(item?.id) { mutableStateOf(item?.category ?: "Geral") }
    var priority by remember(item?.id) { mutableStateOf(item?.priority ?: "medium") }
    var expectedDate by remember(item?.id) { mutableStateOf(item?.expectedDate.orEmpty()) }
    var description by remember(item?.id) { mutableStateOf(item?.description.orEmpty()) }
    var link by remember(item?.id) { mutableStateOf(item?.link.orEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = onDismiss, containerColor = DarkSurfaceElevated,
        title = { Text(if (item == null) "Novo desejo ou meta" else "Editar desejo", color = TextPrimary) },
        text = {
            Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                FinanceTextField(title, { title = it }, "Título")
                FinanceTextField(price, { price = it }, "Valor estimado", keyboardType = KeyboardType.Decimal)
                FinanceTextField(category, { category = it }, "Categoria")
                Text("Prioridade", color = TextSecondary)
                Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    listOf("high" to "Alta", "medium" to "Média", "low" to "Baixa").forEach { (key, label) ->
                        Button(onClick = { priority = key }, colors = ButtonDefaults.buttonColors(containerColor = if (priority == key) BrandIndigo else DarkSurface)) { Text(label) }
                    }
                }
                FinanceDateField(expectedDate, { expectedDate = it }, "Data desejada (opcional)", optional = true)
                FinanceTextField(description, { description = it }, "Observações")
                FinanceTextField(link, { link = it }, "Link (opcional)")
                error?.let { Text(it, color = IncorrectRoseText) }
            }
        },
        confirmButton = { Button(enabled = !saving, onClick = {
            val amount = price.toMoney()
            if (title.isBlank() || amount == null || !amount.isFinite() || amount < 0.0 || (expectedDate.isNotBlank() && !isValidDate(expectedDate))) { error = "Informe título, valor e data válidos."; return@Button }
            onSave(FinanceWishlistItem(item?.id.orEmpty(), title.trim(), amount, priority, category.trim().ifEmpty { "Geral" },
                expectedDate.trim().ifEmpty { null }, description.trim().ifEmpty { null }, link.trim().ifEmpty { null }, item?.createdAt, item?.updatedAt))
        }) { Text(if (saving) "Salvando…" else "Salvar") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar", color = TextSecondary) } },
    )
}

@Composable
fun FinanceHelpDialog(onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss, containerColor = DarkSurfaceElevated,
        icon = { Icon(Icons.AutoMirrored.Filled.HelpOutline, null, tint = BrandIndigoLight) },
        title = { Text("Guia financeiro", color = TextPrimary) },
        text = {
            Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                HelpTopic("Resumo", "Acompanhe saldo atual, entradas e saídas. O seletor de conta e período atualiza os indicadores e a lista.")
                HelpTopic("Transações", "Registre receitas, despesas, transferências entre contas e itens pendentes. Edite ou arquive registros pelo histórico.")
                HelpTopic("Empréstimos", "Informe pessoa, principal, total esperado e vencimento. Pagamentos parciais criam lançamentos vinculados e atualizam o progresso juntos.")
                HelpTopic("Desejos e metas", "Planeje compras, prioridade, categoria e data. Ao adquirir, o app registra uma despesa e permite remover o desejo.")
                HelpTopic("Contas", "Defina saldo inicial, nome e cor. Arquivar uma conta preserva o histórico e impede seu uso em novos registros.")
                HelpTopic("Dados", "Os registros ficam no SQLite do aplicativo e passam pelas migrações e regras do synapse-core. O Android ainda não sincroniza esta base com a Conta Nuvem.")
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Entendi", color = BrandIndigoLight) } },
    )
}

@Composable
private fun HelpTopic(title: String, body: String) {
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(title, color = TextPrimary, fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold)
        Text(body, color = TextSecondary, fontSize = 12.sp)
    }
}

private fun String?.toColor(): Color? = runCatching { this?.let { Color(android.graphics.Color.parseColor(it)) } }.getOrNull()
private val ACCOUNT_COLORS = listOf("#8a05be", "#ff5f00", "#dc2626", "#2563eb", "#eab308", "#06b6d4", "#10b981", "#6366f1", "#64748b")
