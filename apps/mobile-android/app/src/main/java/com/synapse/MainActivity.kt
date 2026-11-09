package com.synapse

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.synapse.ui.anki.AnkiStudyScreen
import com.synapse.ui.anki.CardItem
import com.synapse.ui.notes.NotesScreen
import com.synapse.ui.quiz.ZenQuizScreen
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.SynapseTheme
import com.synapse.ui.vault.VaultScreen
import com.synapse.ui.video.VideoPlayerScreen

enum class NavItem(val title: String, val icon: ImageVector) {
    VIDEO("Vídeo", Icons.Default.PlayCircle),
    ANKI("Anki", Icons.Default.Psychology),
    QUIZ("Quiz", Icons.Default.Quiz),
    NOTES("Notas", Icons.Default.Assignment),
    VAULT("Cofre", Icons.Default.Lock)
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            SynapseTheme {
                var currentTab by remember { mutableStateOf(NavItem.VIDEO) }

                // Hierarchical back press: If not on primary VIDEO tab, return to VIDEO first
                BackHandler(enabled = currentTab != NavItem.VIDEO) {
                    currentTab = NavItem.VIDEO
                }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    containerColor = DarkCanvas,
                    bottomBar = {
                        NavigationBar(containerColor = DarkSurface) {
                            NavItem.values().forEach { item ->
                                NavigationBarItem(
                                    selected = currentTab == item,
                                    onClick = { currentTab = item },
                                    icon = { Icon(item.icon, contentDescription = item.title) },
                                    label = { Text(item.title) }
                                )
                            }
                        }
                    }
                ) { innerPadding ->
                    Surface(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding),
                        color = DarkCanvas
                    ) {
                        when (currentTab) {
                            NavItem.VIDEO -> VideoPlayerScreen()
                            NavItem.ANKI -> AnkiStudyScreen(
                                cards = listOf(
                                    CardItem("1", "O que é FSRS v5?", "Free Spaced Repetition Scheduler v5, algoritmo moderno baseado em Estabilidade e Dificuldade."),
                                    CardItem("2", "Qual a cifra AEAD do Caderno?", "AES-256-GCM com autenticação em Galois Field GF(2^128)."),
                                    CardItem("3", "Qual a latência da ponte Rust?", "Zero overhead com C-ABI e UniFFI FFI direta sem serialização JSON.")
                                )
                            )
                            NavItem.QUIZ -> ZenQuizScreen()
                            NavItem.NOTES -> NotesScreen()
                            NavItem.VAULT -> VaultScreen()
                        }
                    }
                }
            }
        }
    }
}
