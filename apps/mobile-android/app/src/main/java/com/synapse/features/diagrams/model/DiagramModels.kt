package com.synapse.features.diagrams.model

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path

data class DiagramItem(
    val id: String,
    val title: String,
    val icon: String = "🎨",
    val updatedAt: String = ""
)

data class DrawPath(
    val path: Path,
    val color: Color,
    val strokeWidth: Float = 6f
)
