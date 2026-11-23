package com.synapse.features.culture.ui.dialogs

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.R
import com.synapse.features.culture.model.CultureMediaItem
import com.synapse.features.culture.viewmodel.CultureUiState
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun CultureEditSheetHost(
    item: CultureMediaItem?,
    state: CultureUiState,
    onDismiss: () -> Unit,
    onSave: (CultureMediaItem) -> Unit,
) {
    var submitting by remember(item?.id) { mutableStateOf(false) }
    var submittedAtVersion by remember(item?.id) { mutableStateOf(state.mutationVersion) }

    LaunchedEffect(item?.id, state.mutationVersion, state.saving, state.error) {
        if (item == null || !submitting) return@LaunchedEffect
        if (state.mutationVersion > submittedAtVersion) {
            submitting = false
            onDismiss()
        } else if (!state.saving && state.error != null) {
            submitting = false
        }
    }

    item?.let { current ->
        CultureEditSheet(
            item = current,
            saving = state.saving,
            error = state.error,
            onDismiss = onDismiss,
            onSave = { updated ->
                submittedAtVersion = state.mutationVersion
                submitting = true
                onSave(updated)
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CultureEditSheet(
    item: CultureMediaItem,
    saving: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onSave: (CultureMediaItem) -> Unit,
) {
    var title by remember(item.id) { mutableStateOf(item.title) }
    var type by remember(item.id) { mutableStateOf(item.type) }
    var progress by remember(item.id) { mutableStateOf(item.currentProgress.toString()) }
    var total by remember(item.id) { mutableStateOf(item.totalProgress.toString()) }
    var coverImage by remember(item.id) { mutableStateOf(item.coverImage.orEmpty()) }
    var accessLink by remember(item.id) { mutableStateOf(item.accessLink.orEmpty()) }
    var synopsis by remember(item.id) { mutableStateOf(item.notes) }
    var isGoal by remember(item.id) { mutableStateOf(item.isGoal) }
    var goalNote by remember(item.id) { mutableStateOf(item.goalNote) }
    val progressValue = progress.toIntOrNull()
    val totalValue = total.toIntOrNull()

    ModalBottomSheet(
        onDismissRequest = { if (!saving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        dragHandle = { BottomSheetDefaults.DragHandle(color = TextSecondary) },
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.culture_item_edit_title), color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(stringResource(R.string.culture_item_title)) },
                singleLine = true,
                colors = cultureEditFieldColors(),
            )
            Text(stringResource(R.string.culture_item_type), color = TextSecondary, fontSize = 13.sp)
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CULTURE_MEDIA_TYPES.forEach { option ->
                    FilterChip(
                        selected = type == option.value,
                        onClick = { if (!saving) type = option.value },
                        label = { Text(stringResource(option.label)) },
                    )
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = progress,
                    onValueChange = { value -> if (value.isEmpty() || value.all(Char::isDigit)) progress = value },
                    modifier = Modifier.weight(1f),
                    label = { Text(stringResource(R.string.culture_item_progress)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    colors = cultureEditFieldColors(),
                )
                OutlinedTextField(
                    value = total,
                    onValueChange = { value -> if (value.isEmpty() || value.all(Char::isDigit)) total = value },
                    modifier = Modifier.weight(1f),
                    label = { Text(stringResource(R.string.culture_item_total)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    colors = cultureEditFieldColors(),
                )
            }
            CultureEditTextField(coverImage, { coverImage = it }, R.string.culture_item_cover)
            CultureEditTextField(accessLink, { accessLink = it }, R.string.culture_item_access)
            OutlinedTextField(
                value = synopsis,
                onValueChange = { synopsis = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(stringResource(R.string.culture_item_synopsis)) },
                minLines = 3,
                colors = cultureEditFieldColors(),
            )
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.culture_item_goal), color = TextPrimary, modifier = Modifier.weight(1f))
                Switch(checked = isGoal, onCheckedChange = { isGoal = it }, enabled = !saving)
            }
            if (isGoal) CultureEditTextField(goalNote, { goalNote = it }, R.string.culture_item_goal_note)
            error?.let { Text(it, color = IncorrectRoseText, fontSize = 13.sp) }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onDismiss, enabled = !saving) {
                    Text(stringResource(R.string.culture_item_cancel), color = TextSecondary)
                }
                Button(
                    onClick = {
                        onSave(
                            item.copy(
                                title = title.trim(),
                                type = type,
                                currentProgress = requireNotNull(progressValue),
                                totalProgress = requireNotNull(totalValue),
                                notes = synopsis,
                                coverImage = coverImage.trim().takeIf(String::isNotEmpty),
                                accessLink = accessLink.trim().takeIf(String::isNotEmpty),
                                isGoal = isGoal,
                                goalNote = goalNote,
                            ),
                        )
                    },
                    enabled = !saving && title.isNotBlank() && progressValue != null && totalValue != null,
                ) {
                    if (saving) CircularProgressIndicator(strokeWidth = 2.dp)
                    else Text(stringResource(R.string.culture_item_save), color = TextPrimary)
                }
            }
        }
    }
}

@Composable
private fun CultureEditTextField(value: String, onValueChange: (String) -> Unit, label: Int) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(stringResource(label)) },
        singleLine = true,
        colors = cultureEditFieldColors(),
    )
}

@Composable
private fun cultureEditFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = TextPrimary,
    unfocusedTextColor = TextPrimary,
    focusedBorderColor = BrandIndigo,
    unfocusedBorderColor = TextSecondary.copy(alpha = 0.45f),
    focusedLabelColor = BrandIndigoLight,
    unfocusedLabelColor = TextSecondary,
)
