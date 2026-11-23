package com.synapse.features.habits.data

import android.content.Context
import com.synapse.core.SynapseHabitsStore
import com.synapse.data.SynapseDatabase
import com.synapse.features.habits.model.HabitItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.temporal.TemporalAdjusters

class HabitRepository(context: Context) : AutoCloseable {
    private val databasePath = SynapseDatabase.path(context)
    private var store: SynapseHabitsStore? = null

    suspend fun load(): List<HabitItem> = withContext(Dispatchers.IO) {
        val localToday = LocalDate.now()
        val weekStart = localToday.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val weekDays = (0..6).map { weekStart.plusDays(it.toLong()).toString() }
        val snapshots = store().getSnapshots(
            weekDays.first(),
            weekDays.last(),
            LocalDate.now(ZoneOffset.UTC).toString(),
        )
        snapshots.map { snapshot ->
            val completedDates = snapshot.recentLogs
                .asSequence()
                .filter { it.habitId == snapshot.habit.id }
                .map { it.date }
                .toSet()
            HabitItem(
                id = snapshot.habit.id,
                name = snapshot.habit.title,
                category = snapshot.habit.category?.takeIf(String::isNotBlank) ?: DEFAULT_CATEGORY,
                icon = snapshot.habit.icon?.takeIf(String::isNotBlank) ?: DEFAULT_ICON,
                currentStreak = snapshot.stats.currentStreak,
                bestStreak = snapshot.stats.bestStreak,
                totalCompleted = snapshot.stats.totalCompleted,
                completionRate30Days = snapshot.stats.completionRate30Days,
                daysCompleted = weekDays.map(completedDates::contains),
                dayDates = weekDays,
                todayCompleted = completedDates.contains(localToday.toString()),
            )
        }
    }

    suspend fun create(name: String, category: String): Unit = withContext(Dispatchers.IO) {
        store().createHabit(
            name.trim(),
            category.trim().ifEmpty { DEFAULT_CATEGORY },
            DEFAULT_COLOR,
            DEFAULT_ICON,
            DAYS_PER_WEEK,
        )
    }

    suspend fun toggleCheckin(habitId: String, date: String): Unit = withContext(Dispatchers.IO) {
        store().toggleCheckin(habitId, date)
    }

    suspend fun delete(habitId: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteHabit(habitId)) { "Habit $habitId no longer exists" }
    }

    @Synchronized
    private fun store(): SynapseHabitsStore = store
        ?: SynapseHabitsStore.open(databasePath).also { store = it }

    @Synchronized
    override fun close() {
        store?.close()
        store = null
    }

    private companion object {
        const val DEFAULT_CATEGORY = "Geral"
        const val DEFAULT_ICON = "⚡"
        const val DEFAULT_COLOR = "#10b981"
        const val DAYS_PER_WEEK = 7
    }
}
