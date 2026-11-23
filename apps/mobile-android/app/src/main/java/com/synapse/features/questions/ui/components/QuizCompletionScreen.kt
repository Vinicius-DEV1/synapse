package com.synapse.features.questions.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun QuizCompletionScreen(
    score: Int,
    totalQuestions: Int,
    onRestart: () -> Unit,
    onReturnToLibrary: () -> Unit,
) {
    val percentage = if (totalQuestions == 0) 0 else score * 100 / totalQuestions

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkCanvas)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = "Sessão concluída",
            color = TextPrimary,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
        )
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 24.dp),
            color = DarkSurface,
            shape = RoundedCornerShape(16.dp),
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = "$score de $totalQuestions corretas",
                    color = TextPrimary,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = "$percentage% de aproveitamento",
                    color = TextSecondary,
                    fontSize = 15.sp,
                )
            }
        }
        Button(
            onClick = onRestart,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 20.dp),
            colors = ButtonDefaults.buttonColors(containerColor = BrandIndigo),
            shape = RoundedCornerShape(8.dp),
        ) {
            Text("Recomeçar sessão", fontWeight = FontWeight.Bold)
        }
        androidx.compose.material3.TextButton(
            onClick = onReturnToLibrary,
            modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
        ) {
            Text("Voltar para questões", color = TextSecondary)
        }
    }
}
