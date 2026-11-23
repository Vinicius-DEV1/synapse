package com.synapse

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.synapse.ui.components.ModulesBottomSheet
import com.synapse.ui.components.localizedTitle
import com.synapse.features.anki.ui.AnkiScreen
import com.synapse.features.calendar.ui.CalendarScreen
import com.synapse.features.culture.ui.CultureScreen
import com.synapse.features.diagrams.ui.DiagramsScreen
import com.synapse.features.finance.ui.FinanceScreen
import com.synapse.features.files.ui.FilesScreen
import com.synapse.features.focus.ui.FocusScreen
import com.synapse.features.habits.ui.HabitsScreen
import com.synapse.features.home.ui.HomeScreen
import com.synapse.features.library.ui.LibraryScreen
import com.synapse.features.notes.ui.NotesScreen
import com.synapse.features.notifications.ui.NotificationsScreen
import com.synapse.features.practice.ui.PracticeScreen
import com.synapse.features.questions.ui.ZenQuizScreen
import com.synapse.features.settings.data.AndroidSettingsRepository
import com.synapse.features.settings.ui.SettingsScreen
import com.synapse.ui.theme.*
import com.synapse.features.trash.ui.TrashScreen
import com.synapse.features.vault.ui.VaultScreen
import com.synapse.features.video.ui.VideoScreen

enum class NavItem(val title: String, val icon: ImageVector, val isPrimary: Boolean = true) {
    HOME("Início", Icons.Default.Home, true),
    NOTES("Notas", Icons.AutoMirrored.Filled.Assignment, true),
    FILES("Arquivos", Icons.Default.Folder, false),
    ANKI("Anki", Icons.Default.Psychology, true),
    QUIZ("Quiz", Icons.Default.Quiz, true),
    DIAGRAMS("Diagramas", Icons.Default.Brush, false),
    HABITS("Hábitos", Icons.Default.CheckCircle, false),
    CALENDAR("Agenda", Icons.Default.CalendarMonth, false),
    CULTURE("Cultura", Icons.Default.Movie, false),
    FOCUS("Foco", Icons.Default.HourglassTop, false),
    FINANCE("Finanças", Icons.Default.ShoppingCart, false),
    LIBRARY("Livros", Icons.AutoMirrored.Filled.MenuBook, false),
    VAULT("Cofre", Icons.Default.Lock, false),
    VIDEO("Vídeo", Icons.Default.PlayCircle, false),
    TRASH("Lixeira", Icons.Default.Delete, false),
    NOTIFICATIONS("Notificações", Icons.Default.Notifications, false),
    PRACTICE("Prática", Icons.Default.Mic, false),
    SETTINGS("Settings", Icons.Default.Settings, false)
}

class MainActivity : ComponentActivity() {
    companion object {
        const val EXTRA_INITIAL_MODULE = "com.synapse.initial_module"
        const val EXTRA_NOTIFICATION_PAGE_ID = "com.synapse.notification_page_id"
        const val EXTRA_NOTIFICATION_EVENT_ID = "com.synapse.notification_event_id"
    }

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            SynapseTheme {
                val settingsRepository = remember { AndroidSettingsRepository(applicationContext) }
                var appSettings by remember { mutableStateOf(settingsRepository.load()) }
                val initialTab = when {
                    !intent.getStringExtra(EXTRA_NOTIFICATION_PAGE_ID).isNullOrBlank() -> NavItem.NOTES
                    !intent.getStringExtra(EXTRA_NOTIFICATION_EVENT_ID).isNullOrBlank() -> NavItem.CALENDAR
                    intent.getStringExtra(EXTRA_INITIAL_MODULE) == NavItem.NOTIFICATIONS.name -> NavItem.NOTIFICATIONS
                    else -> NavItem.HOME
                }
                var currentTab by rememberSaveable { mutableStateOf(initialTab) }
                var showMoreSheet by rememberSaveable { mutableStateOf(false) }
                var immersiveStudy by rememberSaveable { mutableStateOf(false) }
                var pendingNoteId by rememberSaveable {
                    mutableStateOf(intent.getStringExtra(EXTRA_NOTIFICATION_PAGE_ID))
                }
                var pendingCalendarEventId by rememberSaveable {
                    mutableStateOf(intent.getStringExtra(EXTRA_NOTIFICATION_EVENT_ID))
                }
                var pendingNoteCreation by rememberSaveable { mutableStateOf(false) }
                val openNote: (String) -> Unit = { noteId ->
                    pendingNoteCreation = false
                    pendingNoteId = noteId
                    currentTab = NavItem.NOTES
                }
                val openNotificationTarget: (String?, String?) -> Unit = { pageId, eventId ->
                    when {
                        !pageId.isNullOrBlank() -> openNote(pageId)
                        !eventId.isNullOrBlank() -> {
                            pendingCalendarEventId = eventId
                            currentTab = NavItem.CALENDAR
                        }
                    }
                }

                LaunchedEffect(currentTab) {
                    if (currentTab != NavItem.ANKI && currentTab != NavItem.QUIZ) immersiveStudy = false
                }

                // Hierarchical back press: If not on primary HOME tab, return to HOME first
                BackHandler(enabled = currentTab != NavItem.HOME) {
                    currentTab = NavItem.HOME
                }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    containerColor = DarkCanvas,
                    bottomBar = {
                        if (!immersiveStudy) {
                        NavigationBar(containerColor = DarkSurface) {
                            // Primary tabs
                            NavItem.values().filter { it.isPrimary }.forEach { item ->
                                NavigationBarItem(
                                    selected = currentTab == item,
                                    onClick = { currentTab = item },
                                    icon = { Icon(item.icon, contentDescription = item.localizedTitle()) },
                                    label = { Text(item.localizedTitle()) },
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
                                label = { Text(if (isSecondarySelected) currentTab.localizedTitle() else "Mais") },
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
                                onCreateNote = {
                                    pendingNoteId = null
                                    pendingNoteCreation = true
                                    currentTab = NavItem.NOTES
                                },
                                onOpenNote = openNote,
                                onNavigateToTab = { tabKey ->
                                    val target = when (tabKey) {
                                        "notes" -> NavItem.NOTES
                                        "files" -> NavItem.FILES
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
                                        "notifications" -> NavItem.NOTIFICATIONS
                                        "practice" -> NavItem.PRACTICE
                                        "settings" -> NavItem.SETTINGS
                                        else -> NavItem.HOME
                                    }
                                    currentTab = target
                                }
                            )
                            NavItem.NOTES -> NotesScreen(
                                initialNoteId = pendingNoteId,
                                createNewNote = pendingNoteCreation,
                                settings = appSettings,
                                onLaunchActionConsumed = {
                                    pendingNoteId = null
                                    pendingNoteCreation = false
                                },
                            )
                            NavItem.FILES -> FilesScreen()
                            NavItem.DIAGRAMS -> DiagramsScreen()
                            NavItem.ANKI -> AnkiScreen(
                                onImmersiveChanged = { immersiveStudy = it },
                                settings = appSettings,
                            )
                            NavItem.QUIZ -> ZenQuizScreen(onImmersiveChanged = { immersiveStudy = it })
                            NavItem.HABITS -> HabitsScreen()
                            NavItem.CALENDAR -> CalendarScreen(
                                onOpenNote = openNote,
                                initialEventId = pendingCalendarEventId,
                                onLaunchActionConsumed = { pendingCalendarEventId = null },
                            )
                            NavItem.CULTURE -> CultureScreen()
                            NavItem.FOCUS -> FocusScreen()
                            NavItem.FINANCE -> FinanceScreen()
                            NavItem.LIBRARY -> LibraryScreen()
                            NavItem.VAULT -> VaultScreen()
                            NavItem.VIDEO -> VideoScreen()
                            NavItem.TRASH -> TrashScreen()
                            NavItem.NOTIFICATIONS -> NotificationsScreen(onOpenTarget = openNotificationTarget)
                            NavItem.PRACTICE -> PracticeScreen()
                            NavItem.SETTINGS -> SettingsScreen(
                                settings = appSettings,
                                onSettingsChange = { updated ->
                                    settingsRepository.save(updated)
                                    appSettings = updated
                                },
                            )
                        }
                    }

                    if (showMoreSheet) {
                        ModulesBottomSheet(
                            currentTab = currentTab,
                            onSelect = { selected ->
                                currentTab = selected
                                showMoreSheet = false
                            },
                            onDismiss = { showMoreSheet = false },
                        )
                    }
                }
            }
        }
    }
}
