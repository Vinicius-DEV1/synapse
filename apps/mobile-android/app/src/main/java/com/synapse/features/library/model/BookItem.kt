package com.synapse.features.library.model

data class BookItem(
    val id: String,
    val title: String,
    val author: String,
    val currentPage: Int,
    val totalPages: Int,
    val status: String = "Lendo",
    val coverEmoji: String = "📖"
)
