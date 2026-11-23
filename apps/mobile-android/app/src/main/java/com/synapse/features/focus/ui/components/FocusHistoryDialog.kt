package com.synapse.features.focus.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.synapse.R
import com.synapse.features.focus.model.FocusSessionItem

@Composable
fun FocusHistoryDialog(sessions: List<FocusSessionItem>, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Default.History, contentDescription = null) },
        title = { Text(stringResource(R.string.focus_history_title)) },
        text = {
            if (sessions.isEmpty()) {
                Text(stringResource(R.string.focus_history_empty))
            } else {
                LazyColumn(
                    modifier = Modifier.heightIn(max = 420.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(sessions, key = FocusSessionItem::id) { session ->
                        FocusHistoryRow(session)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.general_close)) }
        },
    )
}

@Composable
private fun FocusHistoryRow(session: FocusSessionItem) {
    val tag = if (session.tag.isBlank()) {
        stringResource(R.string.focus_session_default_tag)
    } else {
        session.tag
    }
    val status = when (session.status) {
        "completed" -> null
        "active", "in_progress" -> stringResource(R.string.focus_session_status_active)
        "cancelled", "aborted", "interrupted" -> stringResource(R.string.focus_session_status_interrupted)
        else -> null
    }
    val details = listOfNotNull(
        session.createdAt?.let(::compactTimestamp)?.takeIf(String::isNotBlank),
        stringResource(R.string.focus_session_duration, session.durationMinutes),
        status,
    ).joinToString(" · ")
    val note = listOfNotNull(session.summary, session.description, session.justification)
        .firstOrNull { it.isNotBlank() }

    Column(Modifier.padding(vertical = 2.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(tag)
        Text(details)
        note?.let { Text(it) }
    }
}

private fun compactTimestamp(value: String): String = value.replace('T', ' ').take(16)
