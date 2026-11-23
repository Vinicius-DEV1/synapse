package com.synapse.features.notifications.data

import android.content.Context
import com.synapse.core.SynapseNotificationsStore
import com.synapse.data.SynapseDatabase
import com.synapse.features.notifications.model.NotificationItem
import com.synapse.features.notifications.platform.AndroidNotificationScheduler
import com.synapse.core.NotificationRecord
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class NotificationsRepository(context: Context) : AutoCloseable {
    private val databasePath = SynapseDatabase.path(context)
    private val notificationScheduler = AndroidNotificationScheduler(context.applicationContext)
    private var store: SynapseNotificationsStore? = null

    suspend fun load(): NotificationSnapshot = withContext(Dispatchers.IO) {
        notificationScheduler.restoreScheduled()
        val notifications = store().getNotifications().map(NotificationRecord::toItem)
        NotificationSnapshot(notifications, store().getUnreadCount())
    }

    suspend fun snooze(item: NotificationItem, titleSuffix: String): NotificationItem = withContext(Dispatchers.IO) {
        val snoozed = store().snoozeNotification(item.id, SNOOZE_DELAY_MINUTES.toUInt(), titleSuffix).toItem()
        notificationScheduler.schedule(snoozed)
        snoozed
    }

    suspend fun markRead(id: String?): Unit = withContext(Dispatchers.IO) {
        val scheduledIds = if (id == null) {
            store().getNotifications().filter { !it.isRead && it.scheduledFor != null }.map { it.id }
        } else {
            listOf(id)
        }
        check(store().markRead(id)) { "Notification is already read or no longer exists" }
        scheduledIds.forEach(notificationScheduler::cancel)
    }

    suspend fun delete(id: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteNotification(id)) { "Notification $id no longer exists" }
        notificationScheduler.cancel(id)
    }

    @Synchronized
    private fun store(): SynapseNotificationsStore = store
        ?: SynapseNotificationsStore.open(databasePath).also { store = it }

    @Synchronized
    override fun close() {
        store?.close()
        store = null
    }

    private companion object {
        const val SNOOZE_DELAY_MINUTES = 15
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

data class NotificationSnapshot(
    val items: List<NotificationItem>,
    val unreadCount: Int,
)
