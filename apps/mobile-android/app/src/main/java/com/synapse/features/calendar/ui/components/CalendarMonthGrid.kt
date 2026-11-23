package com.synapse.features.calendar.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.calendar.model.CalendarEventItem
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun CalendarMonthGrid(
    month: YearMonth,
    selectedDate: LocalDate?,
    events: List<CalendarEventItem>,
    onMonthChange: (YearMonth) -> Unit,
    onDateSelected: (LocalDate) -> Unit,
    onClearDate: () -> Unit,
) {
    val locale = Locale.getDefault()
    val monthTitle = remember(month, locale) {
        month.format(DateTimeFormatter.ofPattern("MMMM yyyy", locale))
            .replaceFirstChar { character -> character.titlecase(locale) }
    }
    val dates = remember(month) { monthGridDates(month) }
    val eventCounts = remember(events) { events.groupingBy(CalendarEventItem::date).eachCount() }
    val weekdayLabels = remember(locale) {
        if (locale.language == "en") {
            listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
        } else {
            listOf("Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb")
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(DarkSurface)
            .padding(horizontal = 8.dp, vertical = 4.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(monthTitle, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (selectedDate != null) {
                    TextButton(onClick = onClearDate) {
                        Text("Todos", color = BrandIndigoLight, fontSize = 12.sp)
                    }
                }
                IconButton(onClick = { onMonthChange(month.minusMonths(1)) }, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Default.ChevronLeft, contentDescription = "Mês anterior", tint = TextSecondary)
                }
                TextButton(
                    onClick = {
                        val today = LocalDate.now()
                        onMonthChange(YearMonth.from(today))
                        onDateSelected(today)
                    },
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 6.dp),
                ) {
                    Text("Hoje", color = BrandIndigoLight, fontSize = 12.sp)
                }
                IconButton(onClick = { onMonthChange(month.plusMonths(1)) }, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Default.ChevronRight, contentDescription = "Próximo mês", tint = TextSecondary)
                }
            }
        }

        Row(modifier = Modifier.fillMaxWidth()) {
            weekdayLabels.forEach { day ->
                Text(
                    text = day,
                    modifier = Modifier.weight(1f),
                    color = TextMuted,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
        }

        LazyVerticalGrid(
            columns = GridCells.Fixed(7),
            modifier = Modifier.height((dates.size / 7 * 34).dp),
            userScrollEnabled = false,
            verticalArrangement = Arrangement.Center,
        ) {
            items(dates, key = { date -> date.toString() }) { date ->
                val inCurrentMonth = YearMonth.from(date) == month
                val isSelected = date == selectedDate
                val isToday = date == LocalDate.now()
                val eventCount = eventCounts[date.toString()] ?: 0
                Column(
                    modifier = Modifier
                        .padding(vertical = 1.dp)
                        .height(32.dp)
                        .clickable {
                            if (!inCurrentMonth) onMonthChange(YearMonth.from(date))
                            onDateSelected(date)
                        },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Surface(
                        modifier = Modifier.size(24.dp),
                        shape = CircleShape,
                        color = if (isSelected) BrandIndigo else Color.Transparent,
                        border = if (isToday && !isSelected) BorderStroke(1.dp, BrandIndigoLight) else null,
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = date.dayOfMonth.toString(),
                                color = when {
                                    isSelected -> Color.White
                                    inCurrentMonth -> TextPrimary
                                    else -> TextMuted
                                },
                                fontSize = 11.sp,
                                fontWeight = if (isSelected || isToday) FontWeight.SemiBold else FontWeight.Normal,
                            )
                        }
                    }
                    Box(
                        modifier = Modifier
                            .padding(top = 1.dp)
                            .size(if (eventCount > 0) 3.dp else 2.dp)
                            .clip(CircleShape)
                            .background(if (eventCount > 0) BrandIndigoLight else Color.Transparent),
                    )
                }
            }
        }
    }
}

private fun monthGridDates(month: YearMonth): List<LocalDate> {
    val firstDay = month.atDay(1)
    val leadingDays = firstDay.dayOfWeek.value % 7
    val trailingDays = (7 - ((leadingDays + month.lengthOfMonth()) % 7)) % 7
    val firstVisibleDate = firstDay.minusDays(leadingDays.toLong())
    return (0 until leadingDays + month.lengthOfMonth() + trailingDays)
        .map { offset -> firstVisibleDate.plusDays(offset.toLong()) }
}
