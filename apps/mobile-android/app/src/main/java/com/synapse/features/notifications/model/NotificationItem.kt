package com.synapse.features.notifications.model

data class NotificationItem(
    val id: String,
    val title: String,
    val message: String,
    val type: String,
    val targetPageId: String?,
    val eventId: String?,
    val scheduledFor: String?,
    val firedAt: String,
    val isRead: Boolean,
    val createdAt: String,
    val eventReminderMinutes: Int? = null,
)
