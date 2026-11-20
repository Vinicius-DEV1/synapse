package com.synapse.features.culture.ui.dialogs

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddMediaSheet(
    title: String,
    type: String,
    onTitleChange: (String) -> Unit,
    onTypeChange: (String) -> Unit,
    onDismiss: () -> Unit,
    onAdd: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = DarkSurfaceElevated,
        dragHandle = { BottomSheetDefaults.DragHandle(color = TextSecondary) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Adicionar Nova Mídia", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            OutlinedTextField(
                value = title,
                onValueChange = onTitleChange,
                label = { Text("Título da Mídia") },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedBorderColor = BrandIndigo,
                    unfocusedBorderColor = DarkBorder
                )
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                listOf("movie" to "Filme", "series" to "Série", "anime" to "Anime").forEach { (value, label) ->
                    val isSelected = type == value
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onTypeChange(value) },
                        shape = RoundedCornerShape(8.dp),
                        color = if (isSelected) BrandIndigo.copy(alpha = 0.25f) else DarkSurface,
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) BrandIndigo else DarkBorder)
                    ) {
                        Text(
                            text = label,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) androidx.compose.ui.graphics.Color.White else TextSecondary,
                            modifier = Modifier.padding(vertical = 10.dp),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
            Button(
                onClick = onAdd,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = BrandIndigo),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Cadastrar Mídia", fontWeight = FontWeight.Bold)
            }
        }
    }
}
