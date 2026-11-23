package com.synapse.features.notes.ui.components

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

internal fun formatNoteUpdatedAt(value: String?): String {
    if (value.isNullOrBlank()) return "Sem data de atualização"
    return runCatching {
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
            .withZone(ZoneId.systemDefault())
            .format(Instant.parse(value))
    }.getOrElse { value.take(16) }
}
