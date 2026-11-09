package com.synapse

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.ui.anki.AnkiStudyScreen
import com.synapse.ui.anki.CardItem
import com.synapse.ui.calendar.CalendarScreen
import com.synapse.ui.culture.CultureScreen
import com.synapse.ui.diagrams.DiagramsScreen
import com.synapse.ui.finance.FinanceScreen
import com.synapse.ui.focus.FocusScreen
import com.synapse.ui.habits.HabitsScreen
import com.synapse.ui.home.HomeScreen
import com.synapse.ui.library.LibraryScreen
import com.synapse.ui.notes.NotesScreen
import com.synapse.ui.quiz.ZenQuizScreen
import com.synapse.ui.theme.*
import com.synapse.ui.trash.TrashScreen
import com.synapse.ui.vault.VaultScreen
import com.synapse.ui.video.VideoPlayerScreen

enum class NavItem(val title: String, val icon: ImageVector, val isPrimary: Boolean = true) {
    HOME("Início", Icons.Default.Home, true),
    NOTES("Notas", Icons.Default.Assignment, true),
    ANKI("Anki", Icons.Default.Psychology, true),
    QUIZ("Quiz", Icons.Default.Quiz, true),
    DIAGRAMS("Diagramas", Icons.Default.Brush, false),
    HABITS("Hábitos", Icons.Default.CheckCircle, false),
    CALENDAR("Agenda", Icons.Default.CalendarMonth, false),
    CULTURE("Cultura", Icons.Default.Movie, false),
    FOCUS("Foco", Icons.Default.HourglassTop, false),
    FINANCE("Finanças", Icons.Default.ShoppingCart, false),
    LIBRARY("Livros", Icons.Default.MenuBook, false),
    VAULT("Cofre", Icons.Default.Lock, false),
    VIDEO("Vídeo", Icons.Default.PlayCircle, false),
    TRASH("Lixeira", Icons.Default.Delete, false)
}

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            SynapseTheme {
                var currentTab by remember { mutableStateOf(NavItem.HOME) }
                var showMoreSheet by remember { mutableStateOf(false) }

                // Hierarchical back press: If not on primary HOME tab, return to HOME first
                BackHandler(enabled = currentTab != NavItem.HOME) {
                    currentTab = NavItem.HOME
                }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    containerColor = DarkCanvas,
                    bottomBar = {
                        NavigationBar(containerColor = DarkSurface) {
                            // Primary tabs
                            NavItem.values().filter { it.isPrimary }.forEach { item ->
                                NavigationBarItem(
                                    selected = currentTab == item,
                                    onClick = { currentTab = item },
                                    icon = { Icon(item.icon, contentDescription = item.title) },
                                    label = { Text(item.title) },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = Color.White,
                                        selectedTextColor = BrandIndigoLight,
                                        indicatorColor = BrandIndigo,
                                        unselectedIconColor = TextSecondary,
                                        unselectedTextColor = TextSecondary
                                    )
                                )
                            }

                            // "Mais" button to open remaining modules
                            val isSecondarySelected = !currentTab.isPrimary
                            NavigationBarItem(
                                selected = isSecondarySelected,
                                onClick = { showMoreSheet = true },
                                icon = {
                                    Icon(
                                        if (isSecondarySelected) currentTab.icon else Icons.Default.GridView,
                                        contentDescription = "Módulos"
                                    )
                                },
                                label = { Text(if (isSecondarySelected) currentTab.title else "Mais") },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = Color.White,
                                    selectedTextColor = BrandIndigoLight,
                                    indicatorColor = BrandIndigo,
                                    unselectedIconColor = TextSecondary,
                                    unselectedTextColor = TextSecondary
                                )
                            )
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
                            NavItem.HOME -> HomeScreen(
                                onNavigateToTab = { tabKey ->
                                    val target = when (tabKey) {
                                        "notes" -> NavItem.NOTES
                                        "diagrams" -> NavItem.DIAGRAMS
                                        "anki" -> NavItem.ANKI
                                        "quiz" -> NavItem.QUIZ
                                        "habits" -> NavItem.HABITS
                                        "calendar" -> NavItem.CALENDAR
                                        "finance" -> NavItem.FINANCE
                                        "focus" -> NavItem.FOCUS
                                        "library" -> NavItem.LIBRARY
                                        "culture" -> NavItem.CULTURE
                                        "vault" -> NavItem.VAULT
                                        "video" -> NavItem.VIDEO
                                        "trash" -> NavItem.TRASH
                                        else -> NavItem.HOME
                                    }
                                    currentTab = target
                                }
                            )
                            NavItem.NOTES -> NotesScreen()
                            NavItem.DIAGRAMS -> DiagramsScreen()
                            NavItem.ANKI -> AnkiStudyScreen(
                                cards = listOf(
                                    CardItem("1", "O que é FSRS v5?", "Free Spaced Repetition Scheduler v5, algoritmo moderno baseado em Estabilidade e Dificuldade."),
                                    CardItem("2", "Qual a cifra AEAD do Caderno?", "AES-256-GCM com autenticação em Galois Field GF(2^128)."),
                                    CardItem("3", "Qual a latência da ponte Rust?", "Zero overhead com C-ABI e UniFFI FFI direta sem serialização JSON.")
                                )
                            )
                            NavItem.QUIZ -> ZenQuizScreen()
                            NavItem.HABITS -> HabitsScreen()
                            NavItem.CALENDAR -> CalendarScreen()
                            NavItem.CULTURE -> CultureScreen()
                            NavItem.FOCUS -> FocusScreen()
                            NavItem.FINANCE -> FinanceScreen()
                            NavItem.LIBRARY -> LibraryScreen()
                            NavItem.VAULT -> VaultScreen()
                            NavItem.VIDEO -> VideoPlayerScreen()
                            NavItem.TRASH -> TrashScreen()
                        }
                    }

                    // More Modules Bottom Sheet
                    if (showMoreSheet) {
                        ModalBottomSheet(
                            onDismissRequest = { showMoreSheet = false },
                            containerColor = DarkSurfaceElevated,
                            dragHandle = { BottomSheetDefaults.DragHandle(color = TextSecondary) }
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 24.dp)
                                    .padding(bottom = 32.dp)
                            ) {
                                Text(
                                    text = "Todos os Módulos Synapse",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary,
                                    modifier = Modifier.padding(bottom = 16.dp)
                                )

                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    NavItem.values().forEach { item ->
                                        val isCurrent = currentTab == item
                                        Surface(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(12.dp))
                                                .clickable {
                                                    currentTab = item
                                                    showMoreSheet = false
                                                },
                                            color = if (isCurrent) BrandIndigo.copy(alpha = 0.2f) else DarkSurface,
                                            border = androidx.compose.foundation.BorderStroke(
                                                1.dp,
                                                if (isCurrent) BrandIndigo else DarkBorder
                                            )
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(14.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(14.dp)
                                            ) {
                                                Icon(
                                                    item.icon,
                                                    contentDescription = item.title,
                                                    tint = if (isCurrent) BrandIndigoLight else TextSecondary,
                                                    modifier = Modifier.size(24.dp)
                                                )
                                                Text(
                                                    text = item.title,
                                                    fontSize = 15.sp,
                                                    fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Medium,
                                                    color = if (isCurrent) Color.White else TextPrimary
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
        }
    }
}
