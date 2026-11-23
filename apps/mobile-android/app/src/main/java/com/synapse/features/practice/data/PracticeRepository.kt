package com.synapse.features.practice.data

import android.content.Context
import com.synapse.core.SynapsePracticeStore
import com.synapse.data.SynapseDatabase
import com.synapse.features.practice.model.PracticeMemory
import com.synapse.features.practice.model.PracticeMessage
import com.synapse.features.practice.model.PracticeSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class PracticeRepository(context: Context) : AutoCloseable {
    private val databasePath = SynapseDatabase.path(context)
    private var store: SynapsePracticeStore? = null

    suspend fun loadSessions(): List<PracticeSession> = withContext(Dispatchers.IO) {
        store().getSessions().map { row ->
            PracticeSession(row.id, row.title, row.startedAt, row.customPrompt)
        }
    }

    suspend fun createSession(title: String, startedAt: String): PracticeSession =
        withContext(Dispatchers.IO) {
            val row = store().createSession(title, startedAt, null)
            PracticeSession(row.id, row.title, row.startedAt, row.customPrompt)
        }

    suspend fun deleteSession(id: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteSession(id)) { "Practice session $id no longer exists" }
    }

    suspend fun loadMessages(sessionId: String): List<PracticeMessage> =
        withContext(Dispatchers.IO) {
            store().getMessages(sessionId).map { row ->
                PracticeMessage(row.id, row.sessionId, row.role, row.textContent, row.createdAt)
            }
        }

    suspend fun createUserMessage(sessionId: String, text: String): PracticeMessage =
        withContext(Dispatchers.IO) {
            val row = store().createMessage(sessionId, "user", text)
            PracticeMessage(row.id, row.sessionId, row.role, row.textContent, row.createdAt)
        }

    suspend fun loadMemories(): List<PracticeMemory> = withContext(Dispatchers.IO) {
        store().getMemories().map { row ->
            PracticeMemory(row.id, row.category, row.fact, row.createdAt)
        }
    }

    suspend fun createMemory(category: String, fact: String): PracticeMemory =
        withContext(Dispatchers.IO) {
            val row = store().createMemory(category, fact)
            PracticeMemory(row.id, row.category, row.fact, row.createdAt)
        }

    suspend fun deleteMemory(id: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteMemory(id)) { "Practice memory $id no longer exists" }
    }

    @Synchronized
    private fun store(): SynapsePracticeStore = store
        ?: SynapsePracticeStore.open(databasePath).also { store = it }

    @Synchronized
    override fun close() {
        store?.close()
        store = null
    }
}
