package com.synapse.features.notifications.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.notifications.data.NotificationsRepository
import com.synapse.features.notifications.model.NotificationItem
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class NotificationsUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val error: String? = null,
    val items: List<NotificationItem> = emptyList(),
    val unreadCount: Int = 0,
)

class NotificationsViewModel(context: Context) : ViewModel() {
    private val repository = NotificationsRepository(context)
    private val mutableState = MutableStateFlow(NotificationsUiState())
    private var generation = 0L
    val state: StateFlow<NotificationsUiState> = mutableState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        if (mutableState.value.saving) return
        val request = ++generation
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(loading = true, error = null)
            try {
                val snapshot = repository.load()
                if (request == generation) {
                    mutableState.value = mutableState.value.copy(
                        loading = false,
                        items = snapshot.items,
                        unreadCount = snapshot.unreadCount,
                    )
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == generation) reportFailure("load notifications", error)
            }
        }
    }

    fun markRead(item: NotificationItem) = mutate("mark notification read") {
        repository.markRead(item.id)
    }

    fun markAllRead() = mutate("mark all notifications read") { repository.markRead(null) }

    fun snooze(item: NotificationItem, titleSuffix: String) = mutate("snooze notification") {
        repository.snooze(item, titleSuffix)
    }

    fun delete(item: NotificationItem) = mutate("delete notification") { repository.delete(item.id) }

    private fun mutate(action: String, operation: suspend () -> Unit) {
        if (mutableState.value.saving || mutableState.value.loading) return
        val request = ++generation
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                operation()
                val snapshot = repository.load()
                if (request == generation) {
                    mutableState.value = mutableState.value.copy(
                        saving = false,
                        items = snapshot.items,
                        unreadCount = snapshot.unreadCount,
                    )
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == generation) reportFailure(action, error)
            }
        }
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(
            loading = false,
            saving = false,
            error = error.message ?: "Não foi possível acessar as notificações.",
        )
    }

    override fun onCleared() {
        repository.close()
        super.onCleared()
    }

    private companion object {
        const val TAG = "SynapseNotifications"
    }
}
