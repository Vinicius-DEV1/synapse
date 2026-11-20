package com.synapse.features.finance.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.ui.theme.*

@Composable
fun FinanceSummaryCard(
    hasTransactions: Boolean,
    netBalance: Double,
    totalIncome: Double,
    totalExpense: Double
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp)),
        color = DarkSurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                text = "Saldo Líquido Consolidado",
                fontSize = 12.sp,
                color = TextMuted,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = if (hasTransactions) "R$ %,.2f".format(netBalance) else "—",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = when {
                    !hasTransactions -> TextMuted
                    netBalance >= 0 -> CorrectEmeraldText
                    else -> IncorrectRoseText
                }
            )
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp)),
                    color = CorrectEmeraldBg
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.ArrowUpward,
                            contentDescription = "Receitas",
                            tint = CorrectEmerald,
                            modifier = Modifier.size(16.dp)
                        )
                        Column {
                            Text("Receitas", fontSize = 10.sp, color = CorrectEmeraldText)
                            Text(
                                if (hasTransactions) "R$ %,.2f".format(totalIncome) else "—",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = CorrectEmeraldText
                            )
                        }
                    }
                }
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp)),
                    color = IncorrectRoseBg
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.ArrowDownward,
                            contentDescription = "Despesas",
                            tint = IncorrectRose,
                            modifier = Modifier.size(16.dp)
                        )
                        Column {
                            Text("Despesas", fontSize = 10.sp, color = IncorrectRoseText)
                            Text(
                                if (hasTransactions) "R$ %,.2f".format(totalExpense) else "—",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = IncorrectRoseText
                            )
                        }
                    }
                }
            }
        }
    }
}
