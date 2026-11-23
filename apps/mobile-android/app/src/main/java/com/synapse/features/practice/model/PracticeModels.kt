package com.synapse.features.practice.model

data class PracticeSession(
    val id: String,
    val title: String,
    val startedAt: String,
    val customPrompt: String?,
)

data class PracticeMessage(
    val id: String,
    val sessionId: String,
    val role: String,
    val text: String,
    val createdAt: String?,
)

data class PracticeMemory(
    val id: String,
    val category: String,
    val fact: String,
    val createdAt: String?,
)
