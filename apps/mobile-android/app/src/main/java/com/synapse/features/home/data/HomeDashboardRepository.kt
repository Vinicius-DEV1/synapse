package com.synapse.features.home.data

import android.content.Context
import com.synapse.core.FinanceSummary
import com.synapse.features.anki.data.AnkiRepository
import com.synapse.features.calendar.data.CalendarRepository
import com.synapse.features.calendar.model.CalendarEventItem
import com.synapse.features.finance.data.FinanceRepository
import com.synapse.features.notes.data.NotesRepository
import com.synapse.features.notes.model.NoteSummary
import java.time.LocalDate

class HomeDashboardRepository(context: Context) : AutoCloseable {
    private val calendarRepository = CalendarRepository(context)
    private val notesRepository = NotesRepository(context)
    private val ankiRepository = AnkiRepository(context)
    private val financeRepository = FinanceRepository(context)

    suspend fun load(): HomeDashboardSnapshot {
        val today = LocalDate.now()
        val events = calendarRepository.load()
        val pinnedNotes = notesRepository.loadPinnedNotes()
        val pinnedIds = pinnedNotes.mapTo(mutableSetOf()) { note -> note.id }
        val recentNotes = notesRepository.loadRecentNotes(40)
            .asSequence()
            .filterNot { it.isPinned || it.id in pinnedIds }
            .filter { it.title.isNotBlank() && it.title != "Nova Página" && it.title != "New Page" }
            .take(5)
            .toList()

        return HomeDashboardSnapshot(
            todayEvents = events.forDate(today),
            tomorrowEvents = events.forDate(today.plusDays(1)),
            dueCardCount = ankiRepository.loadTotalDueCount(),
            pinnedNotes = pinnedNotes,
            recentNotes = recentNotes,
            financeSummary = financeRepository.loadDashboardSummary(),
        )
    }

    private fun List<CalendarEventItem>.forDate(date: LocalDate): List<CalendarEventItem> =
        filter { it.date == date.toString() }.sortedWith(compareBy(CalendarEventItem::time, CalendarEventItem::title))

    override fun close() {
        calendarRepository.close()
        notesRepository.close()
        ankiRepository.close()
        financeRepository.close()
    }
}

data class HomeDashboardSnapshot(
    val todayEvents: List<CalendarEventItem>,
    val tomorrowEvents: List<CalendarEventItem>,
    val dueCardCount: Long,
    val pinnedNotes: List<NoteSummary>,
    val recentNotes: List<NoteSummary>,
    val financeSummary: FinanceSummary,
)
