package com.synapse.features.trash.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextSecondary

@Composable
fun TrashFilterBar(selected: TrashFilter, onSelect: (TrashFilter) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(TrashFilter.entries) { filter ->
            val isSelected = selected == filter
            Surface(
                modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { onSelect(filter) },
                shape = RoundedCornerShape(8.dp),
                color = if (isSelected) BrandIndigo.copy(alpha = 0.25f) else DarkSurface,
                border = BorderStroke(1.dp, if (isSelected) BrandIndigo else DarkBorder),
            ) {
                Text(
                    text = filter.label,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                    color = if (isSelected) Color.White else TextSecondary,
                    fontSize = 12.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                )
            }
        }
    }
}
