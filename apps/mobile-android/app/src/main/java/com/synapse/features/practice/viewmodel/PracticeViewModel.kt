package com.synapse.features.practice.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.practice.data.PracticeRepository
import com.synapse.features.practice.model.PracticeMemory
import com.synapse.features.practice.model.PracticeMessage
import com.synapse.features.practice.model.PracticeSession
import java.time.Instant
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class PracticeUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val loadingMessages: Boolean = false,
    val error: String? = null,
    val sessions: List<PracticeSession> = emptyList(),
    val selectedSessionId: String? = null,
    val messages: List<PracticeMessage> = emptyList(),
    val memories: List<PracticeMemory> = emptyList(),
)

class PracticeViewModel(context: Context) : ViewModel() {
    private val repository = PracticeRepository(context)
    private val mutableState = MutableStateFlow(PracticeUiState())
    private var sessionRequest = 0L
    private var messageRequest = 0L
    val state: StateFlow<PracticeUiState> = mutableState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        val request = ++sessionRequest
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(loading = true, error = null)
            try {
                val sessions = repository.loadSessions()
                val memories = repository.loadMemories()
                if (request == sessionRequest) {
                    mutableState.value = mutableState.value.copy(
                        loading = false,
                        sessions = sessions,
                        memories = memories,
                    )
                    mutableState.value.selectedSessionId?.let(::selectSession)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == sessionRequest) reportFailure("load practice data", error)
            }
        }
    }

    fun selectSession(sessionId: String?) {
        val request = ++messageRequest
        mutableState.value = mutableState.value.copy(
            selectedSessionId = sessionId,
            messages = if (sessionId == mutableState.value.selectedSessionId) {
                mutableState.value.messages
            } else {
                emptyList()
            },
            loadingMessages = sessionId != null,
            error = null,
        )
        if (sessionId == null) return
        viewModelScope.launch {
            try {
                val messages = repository.loadMessages(sessionId)
                if (request == messageRequest && mutableState.value.selectedSessionId == sessionId) {
                    mutableState.value = mutableState.value.copy(loadingMessages = false, messages = messages)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == messageRequest) reportFailure("load practice transcript", error)
            }
        }
    }

    fun createSession(title: String) = mutate("create practice session") {
        val created = repository.createSession(title, Instant.now().toString())
        mutableState.value = mutableState.value.copy(
            sessions = listOf(created) + mutableState.value.sessions,
            selectedSessionId = created.id,
            messages = emptyList(),
        )
    }

    fun deleteSession(session: PracticeSession) = mutate("delete practice session") {
        repository.deleteSession(session.id)
        val isSelected = mutableState.value.selectedSessionId == session.id
        mutableState.value = mutableState.value.copy(
            sessions = mutableState.value.sessions.filterNot { it.id == session.id },
            selectedSessionId = if (isSelected) null else mutableState.value.selectedSessionId,
            messages = if (isSelected) emptyList() else mutableState.value.messages,
        )
    }

    fun saveUserMessage(text: String): Boolean {
        val sessionId = mutableState.value.selectedSessionId ?: return false
        return mutate("save practice note") {
            val created = repository.createUserMessage(sessionId, text)
            if (mutableState.value.selectedSessionId == sessionId) {
                mutableState.value = mutableState.value.copy(messages = mutableState.value.messages + created)
            }
        }
    }

    fun createMemory(category: String, fact: String) = mutate("create practice memory") {
        val created = repository.createMemory(category, fact)
        mutableState.value = mutableState.value.copy(memories = listOf(created) + mutableState.value.memories)
    }

    fun deleteMemory(memory: PracticeMemory) = mutate("delete practice memory") {
        repository.deleteMemory(memory.id)
        mutableState.value = mutableState.value.copy(
            memories = mutableState.value.memories.filterNot { it.id == memory.id },
        )
    }

    private fun mutate(action: String, operation: suspend () -> Unit): Boolean {
        if (mutableState.value.saving || mutableState.value.loading) return false
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                operation()
                mutableState.value = mutableState.value.copy(saving = false)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure(action, error)
            }
        }
        return true
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(
            loading = false,
            loadingMessages = false,
            saving = false,
            error = error.message ?: "Não foi possível acessar os dados de prática.",
        )
    }

    override fun onCleared() {
        repository.close()
        super.onCleared()
    }

    private companion object {
        const val TAG = "SynapsePractice"
    }
}
