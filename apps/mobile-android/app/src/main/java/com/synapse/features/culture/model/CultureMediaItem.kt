package com.synapse.features.culture.model

data class CultureMediaItem(
    val id: String,
    val title: String,
    val type: String,
    val status: String,
    val score: Double = 8.5,
    val currentProgress: Int = 0,
    val totalProgress: Int = 12,
    val notes: String = ""
)
