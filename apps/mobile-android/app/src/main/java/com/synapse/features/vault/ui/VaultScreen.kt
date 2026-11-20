package com.synapse.features.vault.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.ui.theme.*

data class VaultCredential(
    val id: String,
    val group: String,
    val label: String,
    val username: String,
    val password: String,
    val url: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VaultScreen(
    initialCredentials: List<VaultCredential> = emptyList()
) {
    val context = LocalContext.current
    var credentials by remember { mutableStateOf(initialCredentials) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedGroup by remember { mutableStateOf("Todos") }
    var revealedPasswords by remember { mutableStateOf(setOf<String>()) }

    val groups = remember(credentials) {
        listOf("Todos") + credentials.map { it.group }.distinct()
    }

    val filteredCredentials = remember(credentials, searchQuery, selectedGroup) {
        credentials.filter { item ->
            val matchGroup = (selectedGroup == "Todos" || item.group == selectedGroup)
            val matchSearch = if (searchQuery.isBlank()) true else {
                item.label.contains(searchQuery, ignoreCase = true) ||
                item.username.contains(searchQuery, ignoreCase = true) ||
                item.url.contains(searchQuery, ignoreCase = true)
            }
            matchGroup && matchSearch
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkCanvas)
            .padding(16.dp)
    ) {
        // Header
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Default.Lock,
                contentDescription = "Cofre",
                tint = BrandPurple,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Cofre E2EE & Credenciais",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Search Bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Buscar credencial...", color = TextMuted) },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Buscar", tint = TextSecondary) },
            shape = RoundedCornerShape(10.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = BrandPurple,
                unfocusedBorderColor = DarkBorder,
                focusedContainerColor = DarkSurface,
                unfocusedContainerColor = DarkSurface
            ),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Group Filter Chips
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(groups) { grp ->
                val isSelected = (grp == selectedGroup)
                FilterChip(
                    selected = isSelected,
                    onClick = { selectedGroup = grp },
                    label = { Text(grp, color = if (isSelected) TextPrimary else TextSecondary) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = BrandIndigo,
                        containerColor = DarkSurface
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = isSelected,
                        borderColor = if (isSelected) BrandIndigoLight else DarkBorder
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Credentials List
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            if (filteredCredentials.isEmpty()) {
                item {
                    Text(
                        text = if (credentials.isEmpty()) {
                            "Nenhuma credencial disponível neste dispositivo."
                        } else {
                            "Nenhuma credencial encontrada."
                        },
                        color = TextSecondary,
                        fontSize = 14.sp,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                    )
                }
            }

            items(filteredCredentials) { item ->
                val isRevealed = revealedPasswords.contains(item.id)
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp)),
                    color = DarkSurface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = item.label,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Text(
                                    text = item.username + (if (item.url.isNotBlank()) " • ${item.url}" else ""),
                                    fontSize = 12.sp,
                                    color = TextSecondary
                                )
                            }
                            AssistChip(
                                onClick = {},
                                label = { Text(item.group, fontSize = 10.sp, color = BrandIndigoLight) },
                                colors = AssistChipDefaults.assistChipColors(containerColor = DarkSurfaceElevated)
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Password Box Row
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp)),
                            color = DarkCanvas
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = if (isRevealed) item.password else "••••••••••••",
                                    fontSize = 13.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = TextPrimary,
                                    modifier = Modifier.weight(1f)
                                )

                                IconButton(
                                    onClick = {
                                        revealedPasswords = if (isRevealed) {
                                            revealedPasswords - item.id
                                        } else {
                                            revealedPasswords + item.id
                                        }
                                    },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(
                                        imageVector = if (isRevealed) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                        contentDescription = if (isRevealed) "Ocultar" else "Ver",
                                        tint = TextSecondary,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }

                                IconButton(
                                    onClick = {
                                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                        val clip = ClipData.newPlainText("Senha do Cofre", item.password)
                                        clipboard.setPrimaryClip(clip)
                                        Toast.makeText(context, "Senha copiada!", Toast.LENGTH_SHORT).show()
                                    },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ContentCopy,
                                        contentDescription = "Copiar",
                                        tint = CorrectEmeraldText,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
