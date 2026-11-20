package com.synapse.features.finance.model

data class TransactionItem(
    val id: String,
    val title: String,
    val amount: Double,
    val isIncome: Boolean,
    val category: String,
    val date: String = "Hoje"
)
