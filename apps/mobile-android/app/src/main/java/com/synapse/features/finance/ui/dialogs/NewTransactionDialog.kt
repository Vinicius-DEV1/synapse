package com.synapse.features.finance.ui.dialogs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.synapse.ui.theme.*

@Composable
fun NewTransactionDialog(
    title: String,
    amount: String,
    category: String,
    isIncome: Boolean,
    onTitleChange: (String) -> Unit,
    onAmountChange: (String) -> Unit,
    onCategoryChange: (String) -> Unit,
    onIncomeChange: (Boolean) -> Unit,
    onDismiss: () -> Unit,
    onRegister: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurfaceElevated,
        title = {
            Text("Nova Transação", color = TextPrimary, fontWeight = FontWeight.Bold)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { onIncomeChange(false) },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (!isIncome) IncorrectRose else DarkSurface
                        ),
                        modifier = androidx.compose.ui.Modifier.weight(1f)
                    ) {
                        Text("Despesa", color = Color.White)
                    }
                    Button(
                        onClick = { onIncomeChange(true) },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isIncome) CorrectEmerald else DarkSurface
                        ),
                        modifier = androidx.compose.ui.Modifier.weight(1f)
                    ) {
                        Text("Receita", color = Color.White)
                    }
                }
                OutlinedTextField(
                    value = title,
                    onValueChange = onTitleChange,
                    label = { Text("Descrição", color = TextSecondary) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = BrandIndigo,
                        unfocusedBorderColor = DarkBorder
                    )
                )
                OutlinedTextField(
                    value = amount,
                    onValueChange = onAmountChange,
                    label = { Text("Valor (R$)", color = TextSecondary) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = BrandIndigo,
                        unfocusedBorderColor = DarkBorder
                    )
                )
                OutlinedTextField(
                    value = category,
                    onValueChange = onCategoryChange,
                    label = { Text("Categoria", color = TextSecondary) },
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
                onClick = onRegister,
                colors = ButtonDefaults.buttonColors(containerColor = BrandIndigo)
            ) {
                Text("Registrar", color = Color.White)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar", color = TextSecondary)
            }
        }
    )
}
