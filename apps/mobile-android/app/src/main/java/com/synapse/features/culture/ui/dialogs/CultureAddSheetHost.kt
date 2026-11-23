package com.synapse.features.culture.ui.dialogs

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.synapse.features.culture.viewmodel.CultureUiState

private const val DEFAULT_MOVIE_TOTAL = "1"
private const val DEFAULT_EPISODE_TOTAL = "12"

@Composable
internal fun CultureAddSheetHost(
    isOpen: Boolean,
    state: CultureUiState,
    onDismiss: () -> Unit,
    onAdd: (String, String, Int) -> Unit,
) {
    var title by remember(isOpen) { mutableStateOf("") }
    var type by remember(isOpen) { mutableStateOf("filme") }
    var total by remember(isOpen) { mutableStateOf(DEFAULT_MOVIE_TOTAL) }
    var submitting by remember(isOpen) { mutableStateOf(false) }
    var submittedAtVersion by remember(isOpen) { mutableStateOf(state.mutationVersion) }

    LaunchedEffect(isOpen, state.mutationVersion, state.saving, state.error) {
        if (!isOpen || !submitting) return@LaunchedEffect
        if (state.mutationVersion > submittedAtVersion) {
            submitting = false
            onDismiss()
        } else if (!state.saving && state.error != null) {
            submitting = false
        }
    }

    if (isOpen) {
        AddMediaSheet(
            title = title,
            type = type,
            totalProgress = total,
            isSaving = state.saving,
            errorMessage = state.error,
            onTitleChange = { title = it },
            onTypeChange = { selected ->
                type = selected
                total = if (selected == "filme") DEFAULT_MOVIE_TOTAL else DEFAULT_EPISODE_TOTAL
            },
            onTotalProgressChange = { total = it },
            onDismiss = { if (!state.saving) onDismiss() },
            onAdd = {
                val parsedTotal = total.toIntOrNull()
                if (title.isNotBlank() && parsedTotal != null && !state.saving) {
                    submittedAtVersion = state.mutationVersion
                    submitting = true
                    onAdd(title.trim(), type, parsedTotal)
                }
            },
        )
    }
}
