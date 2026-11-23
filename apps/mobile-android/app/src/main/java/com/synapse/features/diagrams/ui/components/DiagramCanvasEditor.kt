package com.synapse.features.diagrams.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.R
import com.synapse.features.diagrams.model.DiagramItem
import com.synapse.features.diagrams.model.DrawPath
import com.synapse.ui.theme.AmberWarning
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.BrandPurple
import com.synapse.ui.theme.CorrectEmerald
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.IncorrectRose
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary

@Composable
fun DiagramCanvasEditor(item: DiagramItem, onBack: () -> Unit) {
    val paths = remember(item.id) { mutableStateListOf<DrawPath>() }
    var currentColor by remember(item.id) { mutableStateOf(BrandIndigo) }
    var currentPath by remember(item.id) { mutableStateOf<Path?>(null) }
    val colorPalette = listOf(BrandIndigo, CorrectEmerald, AmberWarning, BrandPurple, IncorrectRose, Color.White)

    Scaffold(
        containerColor = Color(0xFF0C0B12),
        topBar = {
            Surface(color = DarkSurface, border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.general_close), tint = TextPrimary)
                        }
                        Text(item.title, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        colorPalette.forEach { color ->
                            Box(
                                modifier = Modifier
                                    .size(24.dp)
                                    .clip(CircleShape)
                                    .background(color)
                                    .border(2.dp, if (currentColor == color) Color.White else Color.Transparent, CircleShape)
                                    .clickable { currentColor = color },
                            )
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                        IconButton(onClick = { paths.clear() }) {
                            Icon(Icons.Default.Delete, contentDescription = stringResource(R.string.diagrams_clear_canvas), tint = IncorrectRoseText)
                        }
                    }
                }
            }
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            Canvas(
                modifier = Modifier.fillMaxSize().pointerInput(item.id, currentColor) {
                    detectDragGestures(
                        onDragStart = { offset ->
                            val path = Path().apply { moveTo(offset.x, offset.y) }
                            currentPath = path
                            paths.add(DrawPath(path, currentColor))
                        },
                        onDrag = { change, _ ->
                            currentPath?.lineTo(change.position.x, change.position.y)
                            if (paths.isNotEmpty()) paths[paths.lastIndex] = paths.last().copy()
                        },
                        onDragEnd = { currentPath = null },
                    )
                },
            ) {
                paths.forEach { drawPath ->
                    drawPath(
                        path = drawPath.path,
                        color = drawPath.color,
                        style = Stroke(width = drawPath.strokeWidth, cap = StrokeCap.Round, join = StrokeJoin.Round),
                    )
                }
            }
            Surface(
                modifier = Modifier.align(Alignment.BottomCenter).padding(12.dp),
                color = DarkSurface.copy(alpha = 0.95f),
                shape = androidx.compose.foundation.shape.RoundedCornerShape(10.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
            ) {
                Text(
                    text = stringResource(R.string.diagrams_editor_unsaved),
                    color = TextPrimary,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                )
            }
        }
    }
}
