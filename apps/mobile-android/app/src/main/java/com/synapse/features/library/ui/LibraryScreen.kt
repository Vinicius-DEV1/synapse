package com.synapse.features.library.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Book
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.ui.theme.*

data class BookItem(
    val id: String,
    val title: String,
    val author: String,
    val currentPage: Int,
    val totalPages: Int,
    val status: String = "Lendo", // Lendo, Concluído, Na Fila
    val coverEmoji: String = "📖"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(
    initialBooks: List<BookItem> = emptyList()
) {
    var books by remember { mutableStateOf(initialBooks) }
    var selectedFilter by remember { mutableStateOf("Todos") }
    var isAddingBook by remember { mutableStateOf(false) }
    var newTitle by remember { mutableStateOf("") }
    var newAuthor by remember { mutableStateOf("") }
    var newTotalPages by remember { mutableStateOf("300") }

    val filteredBooks = remember(books, selectedFilter) {
        if (selectedFilter == "Todos") books
        else books.filter { it.status.equals(selectedFilter, ignoreCase = true) }
    }

    val totalPagesRead = remember(books) {
        books.sumOf { it.currentPage }
    }

    Scaffold(
        containerColor = DarkCanvas,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { isAddingBook = true },
                containerColor = BrandIndigo,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Novo Livro")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // Title
            Text(
                text = "Biblioteca & Leituras",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Text(
                text = "$totalPagesRead páginas lidas acumuladas • ${books.size} livros no acervo",
                fontSize = 13.sp,
                color = TextSecondary
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Filter Tabs
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("Todos", "Lendo", "Concluído", "Na Fila").forEach { filter ->
                    val isSelected = selectedFilter == filter
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .clickable { selectedFilter = filter },
                        color = if (isSelected) BrandIndigo else DarkSurface,
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isSelected) BrandIndigoLight else DarkBorder
                        )
                    ) {
                        Text(
                            text = filter,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                            color = if (isSelected) Color.White else TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Books List
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (filteredBooks.isEmpty()) {
                    item {
                        Text(
                            text = "Nenhum livro disponível neste dispositivo.",
                            color = TextMuted,
                            fontSize = 14.sp,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 32.dp)
                        )
                    }
                }

                items(filteredBooks, key = { it.id }) { book ->
                    val progressRatio = if (book.totalPages > 0) book.currentPage.toFloat() / book.totalPages else 0f
                    val percentage = (progressRatio * 100).toInt()

                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp)),
                        color = DarkSurface,
                        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Text(text = book.coverEmoji, fontSize = 26.sp)
                                    Column {
                                        Text(
                                            text = book.title,
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )
                                        Text(
                                            text = book.author,
                                            fontSize = 12.sp,
                                            color = TextMuted
                                        )
                                    }
                                }

                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = when (book.status) {
                                        "Concluído" -> CorrectEmeraldBg
                                        "Lendo" -> BrandIndigo.copy(alpha = 0.2f)
                                        else -> DarkSurfaceElevated
                                    }
                                ) {
                                    Text(
                                        text = book.status,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = when (book.status) {
                                            "Concluído" -> CorrectEmeraldText
                                            "Lendo" -> BrandIndigoLight
                                            else -> TextMuted
                                        }
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Progress Bar
                            LinearProgressIndicator(
                                progress = { progressRatio.coerceIn(0f, 1f) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(6.dp)
                                    .clip(RoundedCornerShape(3.dp)),
                                color = BrandIndigo,
                                trackColor = DarkSurfaceElevated,
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            // Progress text and quick stepper buttons
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Pág. ${book.currentPage} de ${book.totalPages} ($percentage%)",
                                    fontSize = 11.sp,
                                    color = TextSecondary
                                )

                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    // -1 page
                                    Surface(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .clickable {
                                                val newPage = maxOf(0, book.currentPage - 1)
                                                books = books.map { if (it.id == book.id) it.copy(currentPage = newPage) else it }
                                            },
                                        color = DarkSurfaceElevated
                                    ) {
                                        Text("-1", modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), fontSize = 11.sp, color = TextSecondary)
                                    }

                                    // +1 page
                                    Surface(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .clickable {
                                                val newPage = minOf(book.totalPages, book.currentPage + 1)
                                                val isNowDone = newPage >= book.totalPages
                                                books = books.map {
                                                    if (it.id == book.id) it.copy(
                                                        currentPage = newPage,
                                                        status = if (isNowDone) "Concluído" else it.status
                                                    ) else it
                                                }
                                            },
                                        color = BrandIndigo.copy(alpha = 0.3f)
                                    ) {
                                        Text("+1", modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), fontSize = 11.sp, color = BrandIndigoLight, fontWeight = FontWeight.Bold)
                                    }

                                    // +5 pages
                                    Surface(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .clickable {
                                                val newPage = minOf(book.totalPages, book.currentPage + 5)
                                                val isNowDone = newPage >= book.totalPages
                                                books = books.map {
                                                    if (it.id == book.id) it.copy(
                                                        currentPage = newPage,
                                                        status = if (isNowDone) "Concluído" else it.status
                                                    ) else it
                                                }
                                            },
                                        color = BrandIndigo.copy(alpha = 0.3f)
                                    ) {
                                        Text("+5", modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), fontSize = 11.sp, color = BrandIndigoLight, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Add Book Dialog
        if (isAddingBook) {
            AlertDialog(
                onDismissRequest = { isAddingBook = false },
                containerColor = DarkSurfaceElevated,
                title = {
                    Text("Novo Livro", color = TextPrimary, fontWeight = FontWeight.Bold)
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(
                            value = newTitle,
                            onValueChange = { newTitle = it },
                            label = { Text("Título", color = TextSecondary) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = BrandIndigo,
                                unfocusedBorderColor = DarkBorder
                            )
                        )
                        OutlinedTextField(
                            value = newAuthor,
                            onValueChange = { newAuthor = it },
                            label = { Text("Autor", color = TextSecondary) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = BrandIndigo,
                                unfocusedBorderColor = DarkBorder
                            )
                        )
                        OutlinedTextField(
                            value = newTotalPages,
                            onValueChange = { newTotalPages = it },
                            label = { Text("Total de Páginas", color = TextSecondary) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = BrandIndigo,
                                unfocusedBorderColor = DarkBorder
                            )
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            val pages = newTotalPages.toIntOrNull() ?: 100
                            if (newTitle.isNotBlank()) {
                                books = listOf(
                                    BookItem(
                                        id = System.currentTimeMillis().toString(),
                                        title = newTitle.trim(),
                                        author = newAuthor.trim(),
                                        currentPage = 0,
                                        totalPages = pages,
                                        status = "Lendo"
                                    )
                                ) + books
                                newTitle = ""
                                newAuthor = ""
                                isAddingBook = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandIndigo)
                    ) {
                        Text("Adicionar", color = Color.White)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { isAddingBook = false }) {
                        Text("Cancelar", color = TextSecondary)
                    }
                }
            )
        }
    }
}
