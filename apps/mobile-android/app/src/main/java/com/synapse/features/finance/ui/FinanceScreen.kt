package com.synapse.features.finance.ui

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
import com.synapse.features.finance.model.TransactionItem
import com.synapse.features.finance.ui.components.FinanceSummaryCard
import com.synapse.features.finance.ui.dialogs.NewTransactionDialog
import com.synapse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FinanceScreen(
    initialTransactions: List<TransactionItem> = emptyList()
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

            FinanceSummaryCard(
                hasTransactions = transactions.isNotEmpty(),
                netBalance = netBalance,
                totalIncome = totalIncome,
                totalExpense = totalExpense
            )

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
                if (filteredTransactions.isEmpty()) {
                    item {
                        Text(
                            text = "Nenhuma transação disponível neste dispositivo.",
                            color = TextMuted,
                            fontSize = 14.sp,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 32.dp)
                        )
                    }
                }

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

        if (isAddingTransaction) {
            NewTransactionDialog(
                title = newTitle,
                amount = newAmount,
                category = newCategory,
                isIncome = newIsIncome,
                onTitleChange = { newTitle = it },
                onAmountChange = { newAmount = it },
                onCategoryChange = { newCategory = it },
                onIncomeChange = { newIsIncome = it },
                onDismiss = { isAddingTransaction = false },
                onRegister = {
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
                }
            )
        }
    }
}
