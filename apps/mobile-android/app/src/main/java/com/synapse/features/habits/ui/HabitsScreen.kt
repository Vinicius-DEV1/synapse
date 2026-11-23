package com.synapse.features.habits.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.synapse.features.habits.ui.components.HabitCard
import com.synapse.features.habits.ui.components.HabitsHelpAction
import com.synapse.features.habits.ui.dialogs.CreateHabitDialog
import com.synapse.features.habits.viewmodel.HabitViewModel
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun HabitsScreen() {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = HabitViewModel(context) as T
        }
    }
    val viewModel: HabitViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()

    var selectedCategory by remember { mutableStateOf("Todos") }
    var isAddingHabit by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var submittedMutationVersion by remember { mutableStateOf(0L) }
    var newHabitName by remember { mutableStateOf("") }
    var newHabitCategory by remember { mutableStateOf("Rotina") }

    LaunchedEffect(state.mutationVersion, state.saving, state.error) {
        if (isSubmitting && state.mutationVersion > submittedMutationVersion) {
            newHabitName = ""
            isAddingHabit = false
            isSubmitting = false
        } else if (isSubmitting && !state.saving && state.error != null) {
            isSubmitting = false
        }
    }

    val categories = remember(state.habits) {
        listOf("Todos") + state.habits.map { it.category }.distinct().sorted()
    }
    val filteredHabits = remember(state.habits, selectedCategory) {
        if (selectedCategory == "Todos") state.habits
        else state.habits.filter { it.category.equals(selectedCategory, ignoreCase = true) }
    }
    val completedToday = remember(state.habits) { state.habits.count { it.todayCompleted } }

    Scaffold(
        containerColor = DarkCanvas,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { isAddingHabit = true },
                containerColor = BrandIndigo,
                contentColor = Color.White,
            ) {
                Icon(Icons.Default.Add, contentDescription = "Novo Hábito")
            }
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
        ) {
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Rastreador de Hábitos", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text(
                        "$completedToday de ${state.habits.size} hábitos concluídos hoje",
                        fontSize = 13.sp,
                        color = TextSecondary,
                    )
                }
                HabitsHelpAction()
            }

            Spacer(modifier = Modifier.height(16.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(categories) { category ->
                    val selected = selectedCategory == category
                    Surface(
                        modifier = Modifier.clip(RoundedCornerShape(16.dp)).clickable { selectedCategory = category },
                        shape = RoundedCornerShape(16.dp),
                        color = if (selected) BrandIndigo else DarkSurface,
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (selected) BrandIndigoLight else DarkBorder),
                    ) {
                        Text(
                            category,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                            color = if (selected) Color.White else TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (state.loading && state.habits.isEmpty()) {
                    item {
                        CircularProgressIndicator(modifier = Modifier.padding(top = 32.dp), color = BrandIndigoLight)
                    }
                }
                if (state.error != null && !isAddingHabit) {
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(state.error.orEmpty(), color = IncorrectRoseText, fontSize = 13.sp)
                            TextButton(onClick = viewModel::refresh, enabled = !state.loading) {
                                Text("Tentar novamente", color = BrandIndigoLight)
                            }
                        }
                    }
                }
                if (!state.loading && filteredHabits.isEmpty()) {
                    item {
                        Text(
                            if (state.habits.isEmpty()) "Nenhum hábito cadastrado ainda." else "Nenhum hábito nesta categoria.",
                            color = TextMuted,
                            fontSize = 14.sp,
                            modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
                        )
                    }
                }
                items(filteredHabits, key = { it.id }) { habit ->
                    HabitCard(
                        habit = habit,
                        saving = state.saving,
                        onCheckin = { date -> if (!state.saving) viewModel.toggleCheckin(habit.id, date) },
                        onDelete = { if (!state.saving) viewModel.delete(habit) },
                    )
                }
            }
        }

        if (isAddingHabit) {
            CreateHabitDialog(
                name = newHabitName,
                category = newHabitCategory,
                isSaving = state.saving,
                errorMessage = state.error.takeIf { isSubmitting },
                onNameChange = { newHabitName = it },
                onCategoryChange = { newHabitCategory = it },
                onDismiss = { if (!state.saving) isAddingHabit = false },
                onCreate = {
                    if (newHabitName.isNotBlank() && !state.saving) {
                        submittedMutationVersion = state.mutationVersion
                        isSubmitting = true
                        viewModel.create(newHabitName.trim(), newHabitCategory.trim())
                    }
                },
            )
        }
    }
}
