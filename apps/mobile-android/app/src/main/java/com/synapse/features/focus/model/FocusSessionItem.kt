package com.synapse.features.focus.model

data class FocusSessionItem(
    val id: String,
    val tag: String,
    val description: String,
    val durationMinutes: Int,
    val status: String,
    val summary: String?,
    val justification: String?,
    val createdAt: String?,
)
