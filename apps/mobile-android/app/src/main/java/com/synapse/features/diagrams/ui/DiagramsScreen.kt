package com.synapse.features.diagrams.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.ui.theme.*

data class DiagramItem(
    val id: String,
    val title: String,
    val icon: String = "🎨",
    val updatedAt: String = "Hoje"
)

data class DrawPath(
    val path: Path,
    val color: Color,
    val strokeWidth: Float = 6f
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiagramsScreen(
    initialDiagrams: List<DiagramItem> = listOf(
        DiagramItem("1", "Arquitetura FFI & Rust Core", "🎨", "Hoje"),
        DiagramItem("2", "Fluxo E2EE Two-Tier Keychain", "🔒", "08/11/2026"),
        DiagramItem("3", "Mapa Mental - Redes Neurais", "🧠", "06/11/2026"),
        DiagramItem("4", "Diagrama de Classes SQLite WAL", "📊", "02/11/2026")
    )
) {
    var diagrams by remember { mutableStateOf(initialDiagrams) }
    var activeDiagram by remember { mutableStateOf<DiagramItem?>(null) }
    var isCreatingDiagram by remember { mutableStateOf(false) }
    var newTitle by remember { mutableStateOf("") }

    // Canvas state
    val paths = remember { mutableStateListOf<DrawPath>() }
    var currentColor by remember { mutableStateOf(BrandIndigo) }
    var currentPath by remember { mutableStateOf<Path?>(null) }

    val colorPalette = listOf(BrandIndigo, CorrectEmerald, AmberWarning, BrandPurple, IncorrectRose, Color.White)

    if (activeDiagram != null) {
        // Full Canvas Whiteboard Editor
        Scaffold(
            containerColor = Color(0xFF0C0B12),
            topBar = {
                Surface(
                    color = DarkSurface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            IconButton(onClick = { activeDiagram = null }) {
                                Icon(Icons.Default.ArrowBack, contentDescription = "Voltar", tint = TextPrimary)
                            }
                            Text(
                                text = activeDiagram?.title ?: "Diagrama",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            colorPalette.forEach { col ->
                                Box(
                                    modifier = Modifier
                                        .size(24.dp)
                                        .clip(CircleShape)
                                        .background(col)
                                        .border(2.dp, if (currentColor == col) Color.White else Color.Transparent, CircleShape)
                                        .clickable { currentColor = col }
                                )
                            }

                            Spacer(modifier = Modifier.width(6.dp))

                            IconButton(onClick = { paths.clear() }) {
                                Icon(Icons.Default.Delete, contentDescription = "Limpar", tint = IncorrectRoseText)
                            }
                        }
                    }
                }
            }
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                Canvas(
                    modifier = Modifier
                        .fillMaxSize()
                        .pointerInput(Unit) {
                            detectDragGestures(
                                onDragStart = { offset ->
                                    val newP = Path().apply { moveTo(offset.x, offset.y) }
                                    currentPath = newP
                                    paths.add(DrawPath(newP, currentColor))
                                },
                                onDrag = { change, _ ->
                                    currentPath?.lineTo(change.position.x, change.position.y)
                                },
                                onDragEnd = {
                                    currentPath = null
                                }
                            )
                        }
                ) {
                    paths.forEach { drawPath ->
                        drawPath(
                            path = drawPath.path,
                            color = drawPath.color,
                            style = Stroke(
                                width = drawPath.strokeWidth,
                                cap = StrokeCap.Round,
                                join = StrokeJoin.Round
                            )
                        )
                    }
                }
            }
        }
    } else {
        // Diagrams Gallery Grid
        Scaffold(
            containerColor = DarkCanvas,
            floatingActionButton = {
                FloatingActionButton(
                    onClick = { isCreatingDiagram = true },
                    containerColor = BrandIndigo,
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Novo Diagrama")
                }
            }
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp)
            ) {
                Text(
                    text = "Diagramas & Lousa",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Text(
                    text = "${diagrams.size} lousas e mapas mentais no acervo",
                    fontSize = 13.sp,
                    color = TextSecondary
                )

                Spacer(modifier = Modifier.height(16.dp))

                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(diagrams, key = { it.id }) { item ->
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(140.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .clickable {
                                    activeDiagram = item
                                    paths.clear()
                                },
                            color = DarkSurface,
                            border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(14.dp),
                                verticalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(BrandIndigo.copy(alpha = 0.15f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(item.icon, fontSize = 18.sp)
                                    }

                                    IconButton(
                                        onClick = { diagrams = diagrams.filter { it.id != item.id } },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Excluir", tint = TextMuted, modifier = Modifier.size(16.dp))
                                    }
                                }

                                Column {
                                    Text(
                                        text = item.title,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary,
                                        maxLines = 2
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = item.updatedAt,
                                        fontSize = 11.sp,
                                        color = TextSecondary
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Create Diagram Modal
            if (isCreatingDiagram) {
                ModalBottomSheet(
                    onDismissRequest = { isCreatingDiagram = false },
                    containerColor = DarkSurfaceElevated,
                    dragHandle = { BottomSheetDefaults.DragHandle(color = TextSecondary) }
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 24.dp)
                            .padding(bottom = 32.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Text(
                            text = "Novo Diagrama ou Lousa",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )

                        OutlinedTextField(
                            value = newTitle,
                            onValueChange = { newTitle = it },
                            label = { Text("Título da Lousa") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = BrandIndigo,
                                unfocusedBorderColor = DarkBorder
                            )
                        )

                        Button(
                            onClick = {
                                if (newTitle.isNotBlank()) {
                                    val created = DiagramItem(
                                        id = java.util.UUID.randomUUID().toString(),
                                        title = newTitle.trim(),
                                        icon = "🎨"
                                    )
                                    diagrams = diagrams + created
                                    newTitle = ""
                                    isCreatingDiagram = false
                                    activeDiagram = created
                                    paths.clear()
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandIndigo),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Criar Lousa", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

