package com.synapse.features.questions.data

data class MobileQuestion(
    val id: String,
    val prompt: String,
    val options: List<String>,
    val correctIndex: Int,
    val explanation: String,
)
