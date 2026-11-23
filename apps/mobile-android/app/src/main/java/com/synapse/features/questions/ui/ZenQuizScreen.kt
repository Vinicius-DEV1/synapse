package com.synapse.features.questions.ui

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.synapse.features.questions.ui.components.QuestionsLibraryScreen
import com.synapse.features.questions.ui.components.AttemptHistoryDialog
import com.synapse.features.questions.ui.components.QuizCompletionScreen
import com.synapse.features.questions.ui.components.QuizStudyScreen
import com.synapse.features.questions.viewmodel.QuestionsViewModel

@Composable
fun ZenQuizScreen(onImmersiveChanged: (Boolean) -> Unit = {}) {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = QuestionsViewModel(context) as T
        }
    }
    val viewModel: QuestionsViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()
    val haptic = LocalHapticFeedback.current
    val inSession = state.questions.isNotEmpty()

    LaunchedEffect(inSession) { onImmersiveChanged(inSession) }
    DisposableEffect(Unit) {
        onDispose { onImmersiveChanged(false) }
    }
    BackHandler(enabled = inSession || state.loadingQuestions) {
        if (!state.saving) viewModel.closeSession()
    }

    when {
        state.finished -> QuizCompletionScreen(
            score = state.score,
            totalQuestions = state.questions.size,
            onRestart = viewModel::restartSession,
            onReturnToLibrary = viewModel::closeSession,
        )
        inSession -> QuizStudyScreen(
            state = state,
            onSelectOption = { index ->
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                viewModel.selectOption(index)
            },
            onConfirmOrContinue = {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                if (state.outcome == null) viewModel.submitAnswer() else viewModel.nextQuestion()
            },
            onToggleExplanation = viewModel::toggleExplanation,
            onReturn = viewModel::closeSession,
        )
        else -> {
            QuestionsLibraryScreen(
                state = state,
                onRefresh = viewModel.catalog::loadLibrary,
                onStartBattery = viewModel::startBattery,
                onStartSimulation = viewModel::startSimulation,
                onStartErrorNotebook = viewModel::startErrorNotebook,
                onShowAttemptHistory = viewModel::loadAttemptHistory,
                onCreateBattery = viewModel.catalog::createBattery,
                onUpdateBattery = viewModel.catalog::updateBattery,
                onDeleteBattery = viewModel.catalog::deleteBattery,
                onManageQuestions = viewModel.catalog::manageQuestions,
                onCloseQuestionManager = viewModel.catalog::closeQuestionManager,
                onShowQuestionHistory = { viewModel.loadQuestionAttemptHistory(it.id) },
                onCreateQuestion = viewModel.catalog::createQuestion,
                onUpdateQuestion = viewModel.catalog::updateQuestion,
                onDeleteQuestion = viewModel.catalog::deleteQuestion,
            )
            if (state.showAttemptHistory) {
                AttemptHistoryDialog(
                    attempts = state.attemptHistory,
                    loading = state.loadingAttemptHistory,
                    error = state.attemptHistoryError,
                    onRetry = viewModel::retryAttemptHistory,
                    onDismiss = viewModel::closeAttemptHistory,
                )
            }
        }
    }
}
