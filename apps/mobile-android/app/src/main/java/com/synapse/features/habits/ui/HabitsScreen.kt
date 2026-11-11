package com.synapse.features.habits.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
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

data class HabitItem(
    val id: String,
    val name: String,
    val icon: String = "⚡",
    val category: String = "Rotina",
    val currentStreak: Int = 0,
    val daysCompleted: List<Boolean> = listOf(false, false, false, false, false, false, false)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HabitsScreen(
    initialHabits: List<HabitItem> = listOf(
        HabitItem("1", "Meditação Matinal", "🧘", "Mente", 12, listOf(true, true, true, true, true, true, true)),
        HabitItem("2", "Revisão Anki (100 cartões)", "🧠", "Estudos", 28, listOf(true, true, true, true, true, true, false)),
        HabitItem("3", "Leitura Técnica (30 min)", "📚", "Estudos", 14, listOf(true, true, true, true, false, true, true)),
        HabitItem("4", "Exercício Físico / Caminhada", "🏃", "Saúde", 5, listOf(false, true, true, true, true, true, false)),
        HabitItem("5", "Beber 2.5L de Água", "💧", "Saúde", 31, listOf(true, true, true, true, true, true, true)),
        HabitItem("6", "Zero Açúcar Refinado", "🥗", "Saúde", 8, listOf(true, false, true, true, true, true, true))
    )
) {
    var habits by remember { mutableStateOf(initialHabits) }
    var selectedCategory by remember { mutableStateOf("Todos") }
    var isAddingHabit by remember { mutableStateOf(false) }
    var newHabitName by remember { mutableStateOf("") }
    var newHabitCategory by remember { mutableStateOf("Geral") }

    val daysOfWeek = listOf("S", "T", "Q", "Q", "S", "S", "D")

    val categories = listOf("Todos", "Saúde", "Estudos", "Mente", "Rotina")

    val filteredHabits = remember(habits, selectedCategory) {
        if (selectedCategory == "Todos") habits
        else habits.filter { it.category.equals(selectedCategory, ignoreCase = true) }
    }

    val totalCompletedToday = remember(habits) {
        habits.count { it.daysCompleted.lastOrNull() == true }
    }

    Scaffold(
        containerColor = DarkCanvas,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { isAddingHabit = true },
                containerColor = BrandIndigo,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Novo Hábito")
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

            // Header Banner
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Rastreador de Hábitos",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "$totalCompletedToday de ${habits.size} hábitos concluídos hoje",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Category Filter Pills
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                categories.forEach { cat ->
                    val isSelected = selectedCategory == cat
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .clickable { selectedCategory = cat },
                        color = if (isSelected) BrandIndigo else DarkSurface,
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isSelected) BrandIndigoLight else DarkBorder
                        )
                    ) {
                        Text(
                            text = cat,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                            color = if (isSelected) Color.White else TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Habits List
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(filteredHabits, key = { it.id }) { habit ->
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp)),
                        color = DarkSurface,
                        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            // Top Row: Icon, Name, Streak badge
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text(text = habit.icon, fontSize = 20.sp)
                                    Column {
                                        Text(
                                            text = habit.name,
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )
                                        Text(
                                            text = habit.category,
                                            fontSize = 11.sp,
                                            color = TextMuted
                                        )
                                    }
                                }

                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = AmberWarningBg,
                                    border = androidx.compose.foundation.BorderStroke(1.dp, AmberWarning.copy(alpha = 0.3f))
                                ) {
                                    Text(
                                        text = "🔥 ${habit.currentStreak} dias",
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                        color = AmberWarningText,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // 7-day Streak Bubbles
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                habit.daysCompleted.forEachIndexed { index, completed ->
                                    val dayName = daysOfWeek.getOrElse(index) { "?" }
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Text(
                                            text = dayName,
                                            fontSize = 10.sp,
                                            color = TextMuted
                                        )
                                        Box(
                                            modifier = Modifier
                                                .size(32.dp)
                                                .clip(CircleShape)
                                                .background(
                                                    if (completed) CorrectEmerald else DarkSurfaceElevated
                                                )
                                                .border(
                                                    1.dp,
                                                    if (completed) CorrectEmerald else DarkBorder,
                                                    CircleShape
                                                )
                                                .clickable {
                                                    val updatedDays = habit.daysCompleted.toMutableList()
                                                    updatedDays[index] = !completed
                                                    val delta = if (updatedDays[index]) 1 else -1
                                                    val newStreak = maxOf(0, habit.currentStreak + delta)
                                                    habits = habits.map {
                                                        if (it.id == habit.id) it.copy(daysCompleted = updatedDays, currentStreak = newStreak)
                                                        else it
                                                    }
                                                },
                                            contentAlignment = Alignment.Center
                                        ) {
                                            if (completed) {
                                                Icon(
                                                    Icons.Default.Check,
                                                    contentDescription = "Concluído",
                                                    tint = Color.White,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Add Habit Dialog
        if (isAddingHabit) {
            AlertDialog(
                onDismissRequest = { isAddingHabit = false },
                containerColor = DarkSurfaceElevated,
                title = {
                    Text("Novo Hábito", color = TextPrimary, fontWeight = FontWeight.Bold)
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(
                            value = newHabitName,
                            onValueChange = { newHabitName = it },
                            label = { Text("Nome do Hábito", color = TextSecondary) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = BrandIndigo,
                                unfocusedBorderColor = DarkBorder
                            )
                        )
                        OutlinedTextField(
                            value = newHabitCategory,
                            onValueChange = { newHabitCategory = it },
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
                            if (newHabitName.isNotBlank()) {
                                habits = listOf(
                                    HabitItem(
                                        id = System.currentTimeMillis().toString(),
                                        name = newHabitName.trim(),
                                        category = newHabitCategory.trim(),
                                        currentStreak = 0,
                                        daysCompleted = listOf(false, false, false, false, false, false, false)
                                    )
                                ) + habits
                                newHabitName = ""
                                isAddingHabit = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandIndigo)
                    ) {
                        Text("Criar", color = Color.White)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { isAddingHabit = false }) {
                        Text("Cancelar", color = TextSecondary)
                    }
                }
            )
        }
    }
}
