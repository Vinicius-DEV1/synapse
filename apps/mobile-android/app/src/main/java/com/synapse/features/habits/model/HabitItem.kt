package com.synapse.features.habits.model

data class HabitItem(
    val id: String,
    val name: String,
    val category: String,
    val icon: String,
    val currentStreak: Int,
    val bestStreak: Int,
    val totalCompleted: Int,
    val completionRate30Days: Int,
    val daysCompleted: List<Boolean>,
    val dayDates: List<String>,
    val todayCompleted: Boolean,
)
