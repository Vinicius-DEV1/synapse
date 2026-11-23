package com.synapse.features.library.ui.dialogs

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.synapse.features.library.viewmodel.LibraryViewModel

@Composable
fun rememberLibraryNotebookActions(viewModel: LibraryViewModel): BookNotebookActions =
    remember(viewModel) {
        BookNotebookActions(
            viewModel::retryNotebook,
            viewModel::createBookmark,
            viewModel::updateBookmark,
            viewModel::deleteBookmark,
            viewModel::createHighlight,
            viewModel::updateHighlightNote,
            viewModel::deleteHighlight,
        )
    }
