package com.synapse.features.culture.ui.dialogs

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
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
    totalProgress: String,
    onTitleChange: (String) -> Unit,
    onTypeChange: (String) -> Unit,
    onTotalProgressChange: (String) -> Unit,
    isSaving: Boolean,
    errorMessage: String?,
    onDismiss: () -> Unit,
    onAdd: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = { if (!isSaving) onDismiss() },
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
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(CULTURE_MEDIA_TYPES) { option ->
                    val isSelected = type == option.value
                    Surface(
                        modifier = Modifier.clickable(enabled = !isSaving) { onTypeChange(option.value) },
                        shape = RoundedCornerShape(8.dp),
                        color = if (isSelected) BrandIndigo.copy(alpha = 0.25f) else DarkSurface,
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) BrandIndigo else DarkBorder)
                    ) {
                        Text(
                            text = stringResource(option.label),
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) androidx.compose.ui.graphics.Color.White else TextSecondary,
                            modifier = Modifier.padding(vertical = 10.dp),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
            OutlinedTextField(
                value = totalProgress,
                onValueChange = { value ->
                    val parsed = value.toIntOrNull()
                    if (value.isEmpty() || (parsed != null && parsed > 0)) onTotalProgressChange(value)
                },
                label = { Text(if (type == "filme") "Unidades de progresso" else "Total de episódios/capítulos") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedBorderColor = BrandIndigo,
                    unfocusedBorderColor = DarkBorder
                )
            )
            errorMessage?.let { message ->
                Text(message, color = IncorrectRoseText, fontSize = 13.sp)
            }
            Button(
                onClick = onAdd,
                enabled = title.isNotBlank() && totalProgress.toIntOrNull() != null && !isSaving,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = BrandIndigo),
                shape = RoundedCornerShape(10.dp)
            ) {
                if (isSaving) {
                    CircularProgressIndicator(color = androidx.compose.ui.graphics.Color.White, strokeWidth = 2.dp)
                } else {
                    Text("Cadastrar Mídia", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
