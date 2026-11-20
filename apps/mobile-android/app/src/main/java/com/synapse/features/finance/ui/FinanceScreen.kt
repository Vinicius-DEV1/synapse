package com.synapse.features.finance.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.synapse.ui.theme.*
import java.time.format.TextStyle
import java.util.Locale

@Composable
fun FinanceScreen() {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                require(modelClass.isAssignableFrom(FinanceViewModel::class.java))
                return modelClass.cast(FinanceViewModel(context))
            }
        }
    }
    val viewModel: FinanceViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()

    Scaffold(
        containerColor = DarkCanvas,
        floatingActionButton = {
            if (state.section != FinanceSection.DASHBOARD) {
                Button(
                    onClick = {
                        if (state.section == FinanceSection.WISHLIST) viewModel.editWishlist(null)
                        else viewModel.editTransaction(null)
                    },
                    enabled = !state.saving,
                    colors = ButtonDefaults.buttonColors(containerColor = BrandIndigo),
                ) { Text(if (state.section == FinanceSection.WISHLIST) "+ Desejo" else "+ Registro") }
            }
        },
    ) { contentPadding ->
        Column(Modifier.fillMaxSize().padding(contentPadding).padding(horizontal = 18.dp)) {
            FinanceHeader(state, viewModel::showHelp, viewModel::showAccounts, viewModel::refresh)
            FinanceNavigation(state, viewModel::selectSection)
            if (state.section == FinanceSection.DASHBOARD || state.section == FinanceSection.TRANSACTIONS) {
                FinancePeriodControl(state, viewModel::movePeriod, viewModel::toggleHistory)
            }
            FinanceAccountFilter(state, viewModel::selectAccount)
            Spacer(Modifier.height(12.dp))
            when {
                state.loading && state.accounts.isEmpty() -> FinanceLoadingState()
                state.error != null && state.accounts.isEmpty() -> FinanceErrorState(state.error.orEmpty(), viewModel::refresh)
                else -> AnimatedContent(
                    targetState = state.section,
                    transitionSpec = { fadeIn() togetherWith fadeOut() using SizeTransform(clip = false) },
                    label = "finance-section",
                ) { section ->
                    when (section) {
                        FinanceSection.DASHBOARD -> FinanceDashboard(state, viewModel)
                        FinanceSection.TRANSACTIONS -> FinanceTransactionsSection(state, viewModel)
                        FinanceSection.LOANS -> FinanceLoansSection(state, viewModel)
                        FinanceSection.WISHLIST -> FinanceWishlistSection(state, viewModel)
                    }
                }
            }
        }
    }

    if (state.transactionEditorVisible) {
        TransactionEditorDialog(
            transaction = state.transactionEditor,
            accounts = state.accounts,
            saving = state.saving,
            onDismiss = viewModel::dismissTransactionEditor,
            onSave = viewModel::saveTransaction,
        )
    }
    if (state.wishlistEditorVisible) {
        WishlistEditorDialog(state.wishlistEditor, state.saving, viewModel::dismissWishlistEditor, viewModel::saveWishlist)
    }
    if (state.accountEditorVisible) AccountManagerDialog(state, viewModel)
    if (state.helpVisible) FinanceHelpDialog(viewModel::dismissHelp)
}

@Composable
private fun FinanceHeader(state: FinanceUiState, onHelp: () -> Unit, onAccounts: () -> Unit, onRefresh: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(top = 18.dp, bottom = 12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.weight(1f)) {
                Text("Finanças pessoais", color = TextPrimary, fontSize = 23.sp, fontWeight = FontWeight.Bold)
                Text("Contas, fluxo de caixa, empréstimos e metas", color = TextSecondary, fontSize = 12.sp)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                FinanceHeaderAction("Contas", Icons.Default.AccountBalanceWallet, onAccounts)
                FinanceHeaderAction("Guia", Icons.AutoMirrored.Filled.HelpOutline, onHelp)
            }
        }
        when {
            state.saving -> Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                CircularProgressIndicator(modifier = Modifier.height(14.dp), strokeWidth = 2.dp, color = BrandIndigoLight)
                Text("Salvando no banco local…", color = TextSecondary, fontSize = 11.sp)
            }
            state.error != null -> Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(state.error, color = IncorrectRoseText, fontSize = 12.sp, modifier = Modifier.weight(1f))
                Button(onClick = onRefresh) { Text("Recarregar") }
            }
        }
    }
}

@Composable
private fun FinanceHeaderAction(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Button(onClick, contentPadding = ButtonDefaults.ContentPadding, colors = ButtonDefaults.buttonColors(containerColor = DarkSurface, contentColor = TextPrimary)) {
        Icon(icon, contentDescription = null, modifier = Modifier.height(16.dp))
        Text(label, fontSize = 11.sp)
    }
}

@Composable
private fun FinanceNavigation(state: FinanceUiState, onSection: (FinanceSection) -> Unit) {
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
        FinanceSection.entries.forEach { section ->
            val selected = state.section == section
            Button(
                onClick = { onSection(section) },
                colors = ButtonDefaults.buttonColors(containerColor = if (selected) BrandIndigo.copy(alpha = 0.24f) else DarkSurface, contentColor = if (selected) BrandIndigoLight else TextSecondary),
                contentPadding = ButtonDefaults.ContentPadding,
            ) { Text(section.label, fontSize = 12.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal) }
        }
    }
}

@Composable
private fun FinancePeriodControl(state: FinanceUiState, onMove: (Long) -> Unit, onHistory: () -> Unit) {
    Surface(color = DarkSurface, shape = MaterialTheme.shapes.medium, border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 6.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Button(onClick = { onMove(-1) }, colors = ButtonDefaults.textButtonColors(contentColor = TextSecondary)) { Text("‹") }
            Text(
                if (state.allHistory) "Todo o histórico" else state.selectedPeriod.month.getDisplayName(TextStyle.FULL, Locale("pt", "BR")).replaceFirstChar { it.uppercase() } + " ${state.selectedPeriod.year}",
                color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
            )
            Button(onClick = { onMove(1) }, colors = ButtonDefaults.textButtonColors(contentColor = TextSecondary)) { Text("›") }
            Button(onClick = onHistory, colors = ButtonDefaults.textButtonColors(contentColor = BrandIndigoLight)) { Text(if (state.allHistory) "Mensal" else "Histórico", fontSize = 11.sp) }
        }
    }
}

@Composable
private fun FinanceAccountFilter(state: FinanceUiState, onSelect: (String) -> Unit) {
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        (listOf(FinanceViewModel.ALL_ACCOUNTS to "Todas") + state.accounts.map { it.id to it.name }).forEach { (id, name) ->
            val selected = state.selectedAccountId == id
            Button(onClick = { onSelect(id) }, colors = ButtonDefaults.buttonColors(containerColor = if (selected) Color.White.copy(alpha = 0.1f) else Color.Transparent, contentColor = if (selected) TextPrimary else TextSecondary)) {
                Text(name, fontSize = 11.sp, maxLines = 1)
            }
        }
    }
}

@Composable
private fun FinanceLoadingState() {
    Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        CircularProgressIndicator(color = BrandIndigoLight)
        Text("Carregando dados financeiros…", color = TextSecondary, modifier = Modifier.padding(top = 12.dp), fontSize = 13.sp)
    }
}

@Composable
private fun FinanceErrorState(message: String, onRetry: () -> Unit) {
    Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text("Não foi possível abrir as finanças", color = IncorrectRoseText, fontWeight = FontWeight.SemiBold)
        Text(message, color = TextSecondary, modifier = Modifier.padding(12.dp))
        Button(onClick = onRetry) { Text("Tentar novamente") }
    }
}
