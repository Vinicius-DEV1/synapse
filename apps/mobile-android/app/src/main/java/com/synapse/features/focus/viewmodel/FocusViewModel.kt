package com.synapse.features.focus.viewmodel

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.focus.data.FocusDailyStats
import com.synapse.features.focus.data.FocusRepository
import com.synapse.features.focus.data.FocusTimerRepository
import com.synapse.features.focus.model.FocusAlarmItem
import com.synapse.features.focus.model.FocusLofiItem
import com.synapse.features.focus.model.FOCUS_PRESET_MINUTES
import com.synapse.features.focus.model.FOCUS_SECONDS_PER_MINUTE
import com.synapse.features.focus.model.FOCUS_SOUND_IDS
import com.synapse.features.focus.model.FocusSessionItem
import com.synapse.features.focus.model.FocusTimerState
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.synapse.features.focus.platform.FocusAlarmScheduler
import com.synapse.features.focus.platform.FocusLofiPlayer
import com.synapse.R
import java.time.LocalDate
import java.time.OffsetDateTime

data class FocusUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val error: String? = null,
    val stats: FocusDailyStats = FocusDailyStats(0, 0),
    val sessions: List<FocusSessionItem> = emptyList(),
    val alarms: List<FocusAlarmItem> = emptyList(),
    val lofiTracks: List<FocusLofiItem> = emptyList(),
    val activeLofiId: String? = null,
    val isLofiPlaying: Boolean = false,
    val timer: FocusTimerState = FocusTimerState(),
)

class FocusViewModel(context: Context) : ViewModel() {
    private val appContext = context.applicationContext
    private val repository = FocusRepository(appContext)
    private val alarmScheduler = FocusAlarmScheduler(appContext)
    private val timerRepository = FocusTimerRepository(context)
    private val mutableState = MutableStateFlow(FocusUiState())
    private val lofiPlayer = FocusLofiPlayer(
        appContext,
        onPlayingChanged = { isPlaying -> mutableState.value = mutableState.value.copy(isLofiPlaying = isPlaying) },
        onPlaybackError = { message ->
            mutableState.value = mutableState.value.copy(isLofiPlaying = false, error = message)
        },
    )
    val state: StateFlow<FocusUiState> = mutableState.asStateFlow()
    private var timerTicker: Job? = null

    init {
        val restoredTimer = timerRepository.load(System.currentTimeMillis())
        mutableState.value = mutableState.value.copy(timer = restoredTimer)
        if (restoredTimer.isRunning) {
            if (restoredTimer.remainingSeconds == 0) completeTimer(restoredTimer.selectedPresetMinutes)
            else startTimerTicker()
        }
    }

    fun selectPreset(minutes: Int) {
        if (minutes !in FOCUS_PRESET_MINUTES) return
        val timer = FocusTimerState(
            selectedPresetMinutes = minutes,
            remainingSeconds = minutes * FOCUS_SECONDS_PER_MINUTE,
            activeSound = mutableState.value.timer.activeSound,
        )
        updateTimer(timer)
    }

    fun toggleTimer() {
        val current = mutableState.value.timer
        if (current.isRunning) {
            val deadline = current.deadlineEpochMillis ?: return
            val remaining = secondsUntil(deadline, System.currentTimeMillis())
            if (remaining == 0) {
                completeTimer(current.selectedPresetMinutes)
            } else {
                updateTimer(current.copy(remainingSeconds = remaining, isRunning = false, deadlineEpochMillis = null))
            }
        } else if (current.remainingSeconds == 0) {
            completeTimer(current.selectedPresetMinutes)
        } else {
            updateTimer(current.copy(
                isRunning = true,
                deadlineEpochMillis = System.currentTimeMillis() + current.remainingSeconds * MILLIS_PER_SECOND,
            ))
            startTimerTicker()
        }
    }

    fun resetTimer() {
        val current = mutableState.value.timer
        updateTimer(FocusTimerState(
            selectedPresetMinutes = current.selectedPresetMinutes,
            remainingSeconds = current.selectedPresetMinutes * FOCUS_SECONDS_PER_MINUTE,
            activeSound = current.activeSound,
        ))
    }

    fun skipMinute() {
        val current = mutableState.value.timer
        val remaining = (current.remainingSeconds - FOCUS_SECONDS_PER_MINUTE).coerceAtLeast(0)
        if (current.isRunning && remaining == 0) {
            completeTimer(current.selectedPresetMinutes)
            return
        }
        val deadline = if (current.isRunning) System.currentTimeMillis() + remaining * MILLIS_PER_SECOND else null
        updateTimer(current.copy(remainingSeconds = remaining, deadlineEpochMillis = deadline))
    }

    fun toggleSound(soundId: String) {
        val current = mutableState.value.timer
        if (soundId !in FOCUS_SOUND_IDS) return
        updateTimer(current.copy(activeSound = if (current.activeSound == soundId) null else soundId))
    }

    fun refresh() {
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(loading = true, error = null)
            try {
                val stats = repository.loadStats(LocalDate.now())
                val sessions = repository.loadSessions()
                val alarms = repository.loadAlarms()
                val lofiTracks = repository.loadLofiTracks()
                alarmScheduler.reconcile(alarms)
                mutableState.value = mutableState.value.copy(
                    loading = false,
                    stats = stats,
                    sessions = sessions,
                    alarms = alarms,
                    lofiTracks = lofiTracks,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("load focus stats", error)
            }
        }
    }

    fun createAlarm(time: String, label: String) = mutateAlarms("create focus alarm") {
        repository.createAlarm(time, label)
    }

    fun setAlarmEnabled(id: String, enabled: Boolean) = mutateAlarms("update focus alarm") {
        val current = repository.loadAlarms().firstOrNull { it.id == id } ?: return@mutateAlarms
        if (current.enabled != enabled) repository.toggleAlarm(id)
    }

    fun deleteAlarm(id: String) = mutateAlarms("delete focus alarm") { repository.deleteAlarm(id) }

    fun importLofiTrack(uri: Uri) = mutateLofi("import focus audio") { repository.importLofiTrack(uri) }

    fun deleteLofiTrack(id: String) {
        if (mutableState.value.activeLofiId == id) {
            lofiPlayer.stop()
            mutableState.value = mutableState.value.copy(activeLofiId = null, isLofiPlaying = false)
        }
        mutateLofi("delete focus audio") { repository.deleteLofiTrack(id) }
    }

    fun toggleLofiTrack(track: FocusLofiItem) {
        try {
            val activeTrackId = mutableState.value.activeLofiId
            lofiPlayer.toggle(track, activeTrackId)
            mutableState.value = mutableState.value.copy(activeLofiId = track.id, error = null)
        } catch (error: Exception) {
            reportFailure("play focus audio", error)
        }
    }

    fun onNotificationPermissionResult(granted: Boolean) {
        if (granted) refresh()
        else mutableState.value = mutableState.value.copy(error = appContext.getString(R.string.focus_alarm_permission_denied))
    }

    private fun recordCompletedSession(minutes: Int) {
        if (mutableState.value.saving) return
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                repository.recordCompletedSession(minutes, OffsetDateTime.now())
                val stats = repository.loadStats(LocalDate.now())
                val sessions = repository.loadSessions()
                mutableState.value = mutableState.value.copy(saving = false, stats = stats, sessions = sessions)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("save completed focus session", error)
            }
        }
    }

    private fun mutateAlarms(action: String, operation: suspend () -> Unit) {
        if (mutableState.value.saving) return
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                operation()
                val alarms = repository.loadAlarms()
                alarmScheduler.reconcile(alarms)
                mutableState.value = mutableState.value.copy(saving = false, alarms = alarms)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure(action, error)
            }
        }
    }

    private fun mutateLofi(action: String, operation: suspend () -> Unit) {
        if (mutableState.value.saving) return
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                operation()
                mutableState.value = mutableState.value.copy(saving = false, lofiTracks = repository.loadLofiTracks())
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure(action, error)
            }
        }
    }

    private fun updateTimer(timer: FocusTimerState) {
        mutableState.value = mutableState.value.copy(timer = timer)
        timerRepository.save(timer)
        if (!timer.isRunning) timerTicker?.cancel()
    }

    private fun startTimerTicker() {
        timerTicker?.cancel()
        timerTicker = viewModelScope.launch {
            while (mutableState.value.timer.isRunning) {
                delay(TIMER_TICK_MILLIS)
                val timer = mutableState.value.timer
                val deadline = timer.deadlineEpochMillis ?: break
                val remaining = secondsUntil(deadline, System.currentTimeMillis())
                if (remaining == 0) {
                    completeTimer(timer.selectedPresetMinutes)
                } else {
                    mutableState.value = mutableState.value.copy(timer = timer.copy(remainingSeconds = remaining))
                }
            }
        }
    }

    private fun completeTimer(minutes: Int) {
        timerTicker?.cancel()
        val current = mutableState.value.timer
        updateTimer(FocusTimerState(
            selectedPresetMinutes = current.selectedPresetMinutes,
            remainingSeconds = current.selectedPresetMinutes * FOCUS_SECONDS_PER_MINUTE,
            activeSound = current.activeSound,
        ))
        recordCompletedSession(minutes)
    }

    private fun secondsUntil(deadlineEpochMillis: Long, nowEpochMillis: Long): Int {
        val remainingMillis = (deadlineEpochMillis - nowEpochMillis).coerceAtLeast(0L)
        return ((remainingMillis + MILLIS_PER_SECOND - 1L) / MILLIS_PER_SECOND).toInt()
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(
            loading = false,
            saving = false,
            error = error.message ?: "Não foi possível salvar a sessão de foco.",
        )
    }


    override fun onCleared() {
        lofiPlayer.release()
        repository.close()
        super.onCleared()
    }

    private companion object {
        const val TAG = "SynapseFocus"
        const val MILLIS_PER_SECOND = 1000L
        const val TIMER_TICK_MILLIS = 1000L
    }
}
