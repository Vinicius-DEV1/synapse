package com.synapse.features.culture.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.ui.theme.*

private val TYPE_FILTERS = listOf("Todos", "Animes", "Filmes", "Séries", "HQs", "Mangás", "Livros", "Novels")
private val STATUS_FILTERS = listOf("Todos", "Em Andamento", "Concluídos", "Planejados", "Objetivos")

@Composable
fun CultureFilters(
    selectedType: String,
    selectedStatus: String,
    searchQuery: String,
    onTypeSelected: (String) -> Unit,
    onStatusSelected: (String) -> Unit,
    onSearchChanged: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(TYPE_FILTERS) { type ->
                val selected = selectedType == type
                Surface(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onTypeSelected(type) },
                    color = if (selected) BrandIndigo.copy(alpha = 0.25f) else DarkSurface,
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (selected) BrandIndigo else DarkBorder,
                    ),
                ) {
                    Text(
                        text = type,
                        fontSize = 12.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                        color = if (selected) Color.White else TextSecondary,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    )
                }
            }
        }

        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(STATUS_FILTERS) { status ->
                val selected = selectedStatus == status
                Surface(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onStatusSelected(status) },
                    color = if (selected) DarkSurfaceElevated else DarkSurface,
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (selected) BrandIndigo else DarkBorder,
                    ),
                ) {
                    Text(
                        text = status,
                        fontSize = 12.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                        color = if (selected) TextPrimary else TextSecondary,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    )
                }
            }
        }

        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchChanged,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            placeholder = { Text("Buscar títulos...", color = TextMuted) },
            leadingIcon = {
                androidx.compose.material3.Icon(
                    Icons.Default.Search,
                    contentDescription = null,
                    tint = TextSecondary,
                )
            },
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary,
                focusedBorderColor = BrandIndigo,
                unfocusedBorderColor = DarkBorder,
                cursorColor = BrandIndigoLight,
            ),
        )
    }
}
