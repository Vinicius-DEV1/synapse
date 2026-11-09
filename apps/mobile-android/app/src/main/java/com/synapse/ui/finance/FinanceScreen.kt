package com.synapse.ui.finance

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.ui.theme.*

data class TransactionItem(
    val id: String,
    val title: String,
    val amount: Double,
    val isIncome: Boolean,
    val category: String,
    val date: String = "Hoje"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FinanceScreen(
    initialTransactions: List<TransactionItem> = listOf(
        TransactionItem("1", "Salário / Proventos", 8500.0, true, "Trabalho", "05/11"),
        TransactionItem("2", "Freelance Rust & Qt 6", 3200.0, true, "Serviços", "07/11"),
        TransactionItem("3", "Aluguel & Condomínio", 2400.0, false, "Moradia", "05/11"),
        TransactionItem("4", "Supermercado Mensal", 850.0, false, "Alimentação", "06/11"),
        TransactionItem("5", "Assinatura Servidor Cloud", 120.0, false, "Tecnologia", "08/11"),
        TransactionItem("6", "Rendimento Fundos / CDB", 450.0, true, "Investimentos", "08/11")
    )
) {
    var transactions by remember { mutableStateOf(initialTransactions) }
    var filterType by remember { mutableStateOf("Todos") }
    var isAddingTransaction by remember { mutableStateOf(false) }
    var newTitle by remember { mutableStateOf("") }
    var newAmount by remember { mutableStateOf("") }
    var newIsIncome by remember { mutableStateOf(false) }
    var newCategory by remember { mutableStateOf("Geral") }

    val totalIncome = remember(transactions) {
        transactions.filter { it.isIncome }.sumOf { it.amount }
    }
    val totalExpense = remember(transactions) {
        transactions.filter { !it.isIncome }.sumOf { it.amount }
    }
    val netBalance = totalIncome - totalExpense

    val filteredTransactions = remember(transactions, filterType) {
        when (filterType) {
            "Receitas" -> transactions.filter { it.isIncome }
            "Despesas" -> transactions.filter { !it.isIncome }
            else -> transactions
        }
    }

    Scaffold(
        containerColor = DarkCanvas,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { isAddingTransaction = true },
                containerColor = BrandIndigo,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Nova Transação")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // Title
            Text(
                text = "Finanças & Controle",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Text(
                text = "Gestão de receitas, despesas e fluxo de caixa",
                fontSize = 13.sp,
                color = TextSecondary
            )

            Spacer(modifier = Modifier.height(16.dp))

            // KPI Overview Banner (Total Balance)
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp)),
                color = DarkSurface,
                border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "Saldo Líquido Consolidado",
                        fontSize = 12.sp,
                        color = TextMuted,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "R$ %,.2f".format(netBalance),
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (netBalance >= 0) CorrectEmeraldText else IncorrectRoseText
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Incomes and Expenses Subcards
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp)),
                            color = CorrectEmeraldBg
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    Icons.Default.ArrowUpward,
                                    contentDescription = "Receitas",
                                    tint = CorrectEmerald,
                                    modifier = Modifier.size(16.dp)
                                )
                                Column {
                                    Text("Receitas", fontSize = 10.sp, color = CorrectEmeraldText)
                                    Text(
                                        "R$ %,.2f".format(totalIncome),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = CorrectEmeraldText
                                    )
                                }
                            }
                        }

                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp)),
                            color = IncorrectRoseBg
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    Icons.Default.ArrowDownward,
                                    contentDescription = "Despesas",
                                    tint = IncorrectRose,
                                    modifier = Modifier.size(16.dp)
                                )
                                Column {
                                    Text("Despesas", fontSize = 10.sp, color = IncorrectRoseText)
                                    Text(
                                        "R$ %,.2f".format(totalExpense),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = IncorrectRoseText
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Filter Tabs
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("Todos", "Receitas", "Despesas").forEach { tab ->
                    val isSelected = filterType == tab
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .clickable { filterType = tab },
                        color = if (isSelected) BrandIndigo else DarkSurface,
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isSelected) BrandIndigoLight else DarkBorder
                        )
                    ) {
                        Text(
                            text = tab,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                            color = if (isSelected) Color.White else TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Transactions List
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filteredTransactions, key = { it.id }) { item ->
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp)),
                        color = DarkSurface,
                        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (item.isIncome) CorrectEmeraldBg else IncorrectRoseBg,
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            if (item.isIncome) Icons.Default.ArrowUpward else Icons.Default.ArrowDownward,
                                            contentDescription = null,
                                            tint = if (item.isIncome) CorrectEmerald else IncorrectRose,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                                Column {
                                    Text(
                                        text = item.title,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                    Text(
                                        text = "${item.category} • ${item.date}",
                                        fontSize = 11.sp,
                                        color = TextMuted
                                    )
                                }
                            }

                            Text(
                                text = (if (item.isIncome) "+ R$ " else "- R$ ") + "%,.2f".format(item.amount),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (item.isIncome) CorrectEmeraldText else IncorrectRoseText
                            )
                        }
                    }
                }
            }
        }

        // Add Transaction Dialog
        if (isAddingTransaction) {
            AlertDialog(
                onDismissRequest = { isAddingTransaction = false },
                containerColor = DarkSurfaceElevated,
                title = {
                    Text("Nova Transação", color = TextPrimary, fontWeight = FontWeight.Bold)
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = { newIsIncome = false },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (!newIsIncome) IncorrectRose else DarkSurface
                                ),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Despesa", color = Color.White)
                            }
                            Button(
                                onClick = { newIsIncome = true },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (newIsIncome) CorrectEmerald else DarkSurface
                                ),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Receita", color = Color.White)
                            }
                        }

                        OutlinedTextField(
                            value = newTitle,
                            onValueChange = { newTitle = it },
                            label = { Text("Descrição", color = TextSecondary) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = BrandIndigo,
                                unfocusedBorderColor = DarkBorder
                            )
                        )

                        OutlinedTextField(
                            value = newAmount,
                            onValueChange = { newAmount = it },
                            label = { Text("Valor (R$)", color = TextSecondary) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = BrandIndigo,
                                unfocusedBorderColor = DarkBorder
                            )
                        )

                        OutlinedTextField(
                            value = newCategory,
                            onValueChange = { newCategory = it },
                            label = { Text("Categoria", color = TextSecondary) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = BrandIndigo,
                                unfocusedBorderColor = DarkBorder
                            )
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            val parsedAmount = newAmount.replace(",", ".").toDoubleOrNull() ?: 0.0
                            if (newTitle.isNotBlank() && parsedAmount > 0) {
                                transactions = listOf(
                                    TransactionItem(
                                        id = System.currentTimeMillis().toString(),
                                        title = newTitle.trim(),
                                        amount = parsedAmount,
                                        isIncome = newIsIncome,
                                        category = newCategory.trim(),
                                        date = "Hoje"
                                    )
                                ) + transactions
                                newTitle = ""
                                newAmount = ""
                                isAddingTransaction = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandIndigo)
                    ) {
                        Text("Registrar", color = Color.White)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { isAddingTransaction = false }) {
                        Text("Cancelar", color = TextSecondary)
                    }
                }
            )
        }
    }
}
