package com.synapse.features.calendar.data

import android.content.Context
import android.graphics.Color as AndroidColor
import android.util.Log
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import com.synapse.core.CalendarEventRecord
import com.synapse.core.CalendarReminderRequestRecord
import com.synapse.core.NotificationRecord
import com.synapse.core.SynapseNotificationsStore
import com.synapse.core.SynapseCalendarStore
import com.synapse.data.SynapseDatabase
import com.synapse.features.calendar.model.CalendarEventItem
import com.synapse.features.notifications.model.NotificationItem
import com.synapse.features.notifications.platform.AndroidNotificationScheduler
import com.synapse.ui.theme.BrandIndigo
import com.synapse.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale

class CalendarRepository(context: Context) : AutoCloseable {
    private val appContext = context.applicationContext
    private val databasePath = SynapseDatabase.path(appContext)
    private val notificationScheduler = AndroidNotificationScheduler(appContext)
    private var store: SynapseCalendarStore? = null
    private var notificationsStore: SynapseNotificationsStore? = null

    suspend fun load(): List<CalendarEventItem> = withContext(Dispatchers.IO) {
        val events = store().getEvents().map(::toItem)
        syncReminderAlarms(events)
        events
    }

    suspend fun create(
        title: String,
        description: String,
        date: String,
        time: String,
        endDate: String,
        endTime: String,
        color: Color,
        eventType: String,
        reminders: List<Int>,
        recurrence: String,
    ): Unit = withContext(Dispatchers.IO) {
        val startDateTime = LocalDate.parse(date)
            .atTime(LocalTime.parse(time))
            .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        val endDateTime = LocalDate.parse(endDate)
            .atTime(LocalTime.parse(endTime))
            .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        val createdEvents = store().createEventSeries(
            title,
            description,
            startDateTime,
            endDateTime,
            eventType,
            color.toCalendarHex(),
            null,
            reminders,
            recurrence,
        )
        check(createdEvents.isNotEmpty()) { "The calendar event was not created." }
        Unit
    }

    suspend fun update(
        eventId: String,
        title: String,
        description: String,
        date: String,
        time: String,
        endDate: String,
        endTime: String,
        color: Color,
        eventType: String,
        reminders: List<Int>,
    ): Unit = withContext(Dispatchers.IO) {
        val startDateTime = LocalDate.parse(date)
            .atTime(LocalTime.parse(time))
            .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        val endDateTime = LocalDate.parse(endDate)
            .atTime(LocalTime.parse(endTime))
            .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        val updated = store().updateEvent(
            eventId,
            title,
            description,
            startDateTime,
            endDateTime,
            color.toCalendarHex(),
            eventType,
            null,
            reminders,
        )
        check(updated) { "O compromisso não existe mais ou foi excluído." }
    }

    suspend fun toggleStatus(eventId: String): Unit = withContext(Dispatchers.IO) {
        store().toggleStatus(eventId)
        Unit
    }

    suspend fun delete(eventId: String): Unit = withContext(Dispatchers.IO) {
        store().deleteEvent(eventId)
        Unit
    }

    suspend fun delete(eventId: String, deleteSeries: Boolean): Unit = withContext(Dispatchers.IO) {
        val deleted = if (deleteSeries) {
            store().deleteEventSeries(eventId) > 0u
        } else {
            store().deleteEvent(eventId)
        }
        check(deleted) { "The calendar event no longer exists." }
        Unit
    }

    private fun toItem(record: CalendarEventRecord): CalendarEventItem {
        val start = record.startDate.orEmpty()
        val end = record.endDate ?: start
        return CalendarEventItem(
            id = record.id,
            title = record.title,
            description = record.description.orEmpty(),
            date = start.substringBefore('T'),
            time = start.substringAfter('T', "09:00").take(5),
            endDate = end.substringBefore('T'),
            endTime = end.substringAfter('T', "09:00").take(5),
            color = parseCalendarColor(record.color),
            isCompleted = record.status == "completed",
            eventType = record.eventType,
            pageId = record.pageId,
            recurrenceRule = record.recurrenceRule,
            reminders = record.reminders,
            notifiedReminders = record.notifiedReminders,
            startInstant = parseStartInstant(start),
        )
    }

    private fun syncReminderAlarms(events: List<CalendarEventItem>) {
        val now = Instant.now()
        val requests = events.flatMap { event ->
            if (event.isCompleted) return@flatMap emptyList()
            val eventStart = event.startInstant ?: return@flatMap emptyList()
            if (eventStart.isBefore(now.minusSeconds(24 * 60 * 60))) return@flatMap emptyList()
            event.reminders.asSequence()
                .distinct()
                .filter { it !in event.notifiedReminders }
                .mapNotNull { reminderMinutes ->
                    val dueAt = eventStart.minusSeconds(reminderMinutes.toLong() * 60)
                    CalendarReminderRequestRecord(
                        eventId = event.id,
                        reminderMinutes = reminderMinutes,
                        title = appContext.getString(R.string.calendar_reminder_title),
                        message = appContext.getString(
                            R.string.calendar_reminder_message,
                            event.title,
                            reminderOffsetLabel(reminderMinutes),
                            DateTimeFormatter.ofPattern("dd/MM HH:mm", Locale.getDefault())
                                .format(eventStart.atZone(ZoneId.systemDefault())),
                        ),
                        targetPageId = event.pageId,
                        scheduledFor = dueAt.atOffset(ZoneOffset.UTC)
                            .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
                    )
                }
                .toList()
        }
        val sync = notificationStore().syncCalendarReminders(requests)
        sync.cancelledIds.forEach(notificationScheduler::cancel)
        sync.scheduledNotifications.map(NotificationRecord::toItem).forEach(notificationScheduler::schedule)
    }

    private fun reminderOffsetLabel(minutes: Int): String = when (minutes) {
        1440 -> appContext.getString(R.string.calendar_reminder_one_day)
        120 -> appContext.getString(R.string.calendar_reminder_two_hours)
        15 -> appContext.getString(R.string.calendar_reminder_fifteen_minutes)
        0 -> appContext.getString(R.string.calendar_reminder_at_time)
        else -> appContext.getString(R.string.calendar_reminder_in_minutes, minutes)
    }

    private fun parseStartInstant(value: String): Instant? = try {
        OffsetDateTime.parse(value).toInstant()
    } catch (_: Exception) {
        try {
            LocalDateTime.parse(value).atZone(ZoneId.systemDefault()).toInstant()
        } catch (error: Exception) {
            Log.w(TAG, "Cannot schedule a calendar reminder for an invalid event start", error)
            null
        }
    }

    private fun parseCalendarColor(value: String): Color = try {
        Color(AndroidColor.parseColor(value))
    } catch (error: IllegalArgumentException) {
        Log.w(TAG, "Using the default color for an invalid calendar color", error)
        BrandIndigo
    }

    private fun Color.toCalendarHex(): String = String.format(Locale.ROOT, "#%06X", 0xFFFFFF and toArgb())

    @Synchronized
    private fun store(): SynapseCalendarStore = store
        ?: SynapseCalendarStore.open(databasePath).also { store = it }

    @Synchronized
    private fun notificationStore(): SynapseNotificationsStore = notificationsStore
        ?: SynapseNotificationsStore.open(databasePath).also { notificationsStore = it }

    @Synchronized
    override fun close() {
        store?.close()
        store = null
        notificationsStore?.close()
        notificationsStore = null
    }

    private companion object {
        const val TAG = "SynapseCalendar"
    }
}

private fun NotificationRecord.toItem(): NotificationItem = NotificationItem(
    id = id,
    title = title,
    message = message,
    type = notificationType,
    targetPageId = targetPageId,
    eventId = eventId,
    scheduledFor = scheduledFor,
    firedAt = firedAt,
    isRead = isRead,
    createdAt = createdAt,
    eventReminderMinutes = eventReminderMinutes,
)
