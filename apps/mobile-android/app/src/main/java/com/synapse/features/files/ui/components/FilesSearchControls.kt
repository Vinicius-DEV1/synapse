package com.synapse.features.files.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.R
import com.synapse.ui.theme.TextSecondary

@Composable
fun FilesSearchControls(
    query: String,
    onQueryChange: (String) -> Unit,
    globalSearch: Boolean,
    onGlobalSearchChange: (Boolean) -> Unit,
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 8.dp),
        label = { Text(stringResource(R.string.files_search_placeholder)) },
        singleLine = true,
    )
    if (query.isNotBlank()) {
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(stringResource(R.string.files_search_all_folders), color = TextSecondary, fontSize = 13.sp)
            Switch(checked = globalSearch, onCheckedChange = onGlobalSearchChange)
        }
    }
}
