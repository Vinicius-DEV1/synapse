package com.synapse.features.culture.ui.dialogs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.culture.model.CultureMediaItem
import com.synapse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CultureDetailsSheet(
    item: CultureMediaItem,
    onDismiss: () -> Unit,
    onMarkCompleted: () -> Unit
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
            Text(item.title, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text(
                "Tipo: ${item.type.uppercase()} • Avaliação: ${item.score}/10",
                fontSize = 13.sp,
                color = TextSecondary
            )
            if (item.notes.isNotBlank()) {
                Text("Sinopse / Notas Pessoais:", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                Text(item.notes, fontSize = 13.sp, color = TextSecondary, lineHeight = 18.sp)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onMarkCompleted,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = CorrectEmerald),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Marcar como Concluído", fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}
