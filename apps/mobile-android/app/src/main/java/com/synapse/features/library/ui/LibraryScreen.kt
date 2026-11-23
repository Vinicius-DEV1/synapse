package com.synapse.features.library.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.synapse.features.library.model.BookItem
import com.synapse.features.library.ui.components.LibraryBookCard
import com.synapse.features.library.ui.components.LibraryHelpAction
import com.synapse.features.library.viewmodel.LibraryViewModel
import com.synapse.features.library.ui.dialogs.NewBookDialog
import com.synapse.features.library.ui.dialogs.BookManagementDialog
import com.synapse.features.library.ui.dialogs.CollectionsManagementDialog
import com.synapse.features.library.ui.dialogs.rememberLibraryNotebookActions
import com.synapse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen() {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = LibraryViewModel(context) as T
        }
    }
    val viewModel: LibraryViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()
    val notebookActions = rememberLibraryNotebookActions(viewModel)
    val books = state.books
    var selectedFilter by remember { mutableStateOf("Todos") }
    var isAddingBook by remember { mutableStateOf(false) }
    var newTitle by remember { mutableStateOf("") }
    var newAuthor by remember { mutableStateOf("") }
    var newTotalPages by remember { mutableStateOf("300") }
    var formError by remember { mutableStateOf<String?>(null) }
    var closeAfterSave by remember { mutableStateOf(false) }
    var bookBeingManaged by remember { mutableStateOf<BookItem?>(null) }
    var managementOpenedAtVersion by remember { mutableLongStateOf(0L) }
    var showCollectionsDialog by remember { mutableStateOf(false) }
    var selectedCollectionId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(state.mutationVersion) {
        if (bookBeingManaged != null && state.mutationVersion > managementOpenedAtVersion) {
            bookBeingManaged = null
        }
    }

    LaunchedEffect(state.saving, state.error) {
        if (closeAfterSave && !state.saving) {
            if (state.error == null) {
                newTitle = ""
                newAuthor = ""
                formError = null
                isAddingBook = false
            }
            closeAfterSave = false
        }
    }

    val filteredBooks = remember(books, selectedFilter, selectedCollectionId) {
        val statusFiltered = if (selectedFilter == "Todos") books
        else books.filter { it.status.equals(selectedFilter, ignoreCase = true) }
        selectedCollectionId?.let { id -> statusFiltered.filter { id in it.collectionIds } } ?: statusFiltered
    }

    LaunchedEffect(state.collections) {
        if (selectedCollectionId != null && state.collections.none { it.id == selectedCollectionId }) {
            selectedCollectionId = null
        }
    }

    val currentProgressPages = state.stats?.currentProgressPages ?: 0L

    Scaffold(
        containerColor = DarkCanvas,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { if (!state.loading && !state.saving) isAddingBook = true },
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

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Biblioteca & Leituras",
                    modifier = Modifier.weight(1f),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                )
                TextButton(onClick = { showCollectionsDialog = true }, enabled = !state.saving) {
                    Text("Coleções", color = BrandIndigoLight)
                }
                LibraryHelpAction()
            }
            Text(
                text = "$currentProgressPages páginas lidas acumuladas • ${books.size} livros no acervo",
                fontSize = 13.sp,
                color = TextSecondary
            )

            Spacer(modifier = Modifier.height(16.dp))

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

            if (state.collections.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    FilterChip(
                        selected = selectedCollectionId == null,
                        onClick = { selectedCollectionId = null },
                        label = { Text("Todas as coleções") },
                    )
                    state.collections.forEach { collection ->
                        FilterChip(
                            selected = selectedCollectionId == collection.id,
                            onClick = {
                                selectedCollectionId = if (selectedCollectionId == collection.id) null else collection.id
                            },
                            label = { Text(collection.name) },
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            state.error?.let { message ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = DarkSurface),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                ) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(message, color = TextPrimary)
                        TextButton(onClick = viewModel::loadLibrary, enabled = !state.loading) {
                            Text("Tentar novamente", color = BrandIndigoLight)
                        }
                    }
                }
            }

            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (state.loading) {
                    item {
                        CircularProgressIndicator(
                            color = BrandIndigo,
                            modifier = Modifier.padding(top = 32.dp),
                        )
                    }
                } else if (filteredBooks.isEmpty()) {
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
                    LibraryBookCard(
                        book = book,
                        enabled = book.totalPages > 0 && !book.isArchived && book.id !in state.savingBookIds && !state.loading,
                        onAdjustProgress = { delta -> viewModel.adjustProgress(book, delta) },
                        onManage = {
                            bookBeingManaged = book
                            managementOpenedAtVersion = state.mutationVersion
                        },
                    )
                }
            }
        }

        if (isAddingBook) {
            NewBookDialog(
                title = newTitle,
                author = newAuthor,
                totalPages = newTotalPages,
                error = formError ?: state.error,
                saving = state.saving,
                onTitleChange = { newTitle = it },
                onAuthorChange = { newAuthor = it },
                onTotalPagesChange = { newTotalPages = it },
                onDismiss = { if (!state.saving) isAddingBook = false },
                onAdd = {
                    val pageCount = newTotalPages.toIntOrNull()
                    when {
                        newTitle.isBlank() -> formError = "Informe o título do livro."
                        pageCount == null || pageCount <= 0 -> formError = "Informe um total de páginas maior que zero."
                        state.loading || state.saving -> Unit
                        else -> {
                            viewModel.createBook(newTitle.trim(), newAuthor.trim(), pageCount)
                            closeAfterSave = true
                        }
                    }
                }
            )
        }

        bookBeingManaged?.let { book ->
            BookManagementDialog(
                book = book,
                collections = state.collections,
                saving = state.saving,
                error = state.error,
                onDismiss = { bookBeingManaged = null },
                onSave = { title, author, collectionIds ->
                    viewModel.updateBook(book, title, author, collectionIds)
                },
                onArchive = { viewModel.setArchived(book, !book.isArchived) },
                onDelete = { viewModel.deleteBook(book) },
                notebookState = state,
                notebookActions = notebookActions,
                onOpenNotebook = { viewModel.openNotebook(book) },
                onCloseNotebook = viewModel::closeNotebook,
            )
        }

        if (showCollectionsDialog) {
            CollectionsManagementDialog(
                collections = state.collections,
                saving = state.saving,
                error = state.error,
                mutationVersion = state.mutationVersion,
                onDismiss = { showCollectionsDialog = false },
                onSave = viewModel::saveCollection,
                onDelete = viewModel::deleteCollection,
            )
        }
    }
}
