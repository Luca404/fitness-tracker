package it.trackrs.fittrackr.features.meals.habits

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import it.trackrs.fittrackr.R
import it.trackrs.fittrackr.diary.HabitRow
import it.trackrs.fittrackr.diary.HabitStatus

@Composable
internal fun HabitSummary(rows: List<HabitRow>, open: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    val type = MaterialTheme.typography
    val openLabel = stringResource(R.string.habit_open)
    Surface(
        onClick = open,
        modifier = Modifier.fillMaxWidth().semantics { onClick(label = openLabel, action = null) },
        shape = MaterialTheme.shapes.large,
        color = colors.surfaceContainer,
        border = BorderStroke(1.dp, colors.outlineVariant),
    ) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text("🌿", Modifier.clearAndSetSemantics {})
                Text(stringResource(R.string.habits), Modifier.weight(1f), style = type.titleMedium)
                Text(
                    stringResource(R.string.habit_summary_count, rows.count { it.status == HabitStatus.OnTrack }, rows.size),
                    color = colors.onSurfaceVariant, style = type.labelSmall,
                )
            }
            BoxWithConstraints(Modifier.fillMaxWidth()) {
                val gap = 4.dp
                val fontScale = LocalDensity.current.fontScale
                val columns = if ((maxWidth - gap * 7) / 8 >= 29.dp * fontScale) 8 else 4
                Column(verticalArrangement = Arrangement.spacedBy(gap)) {
                    rows.chunked(columns).forEach { group ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(gap)) {
                            group.forEach { row -> HabitTile(row, Modifier.weight(1f)) }
                        }
                    }
                }
            }
            Text(
                stringResource(R.string.habit_summary_window),
                color = colors.onSurfaceVariant, style = type.bodySmall,
            )
        }
    }
}

@Composable
private fun HabitTile(row: HabitRow, modifier: Modifier) {
    val colors = MaterialTheme.colorScheme
    val type = MaterialTheme.typography
    val status = row.status
    val tint = when (status) {
        HabitStatus.OnTrack -> habitProgressColor(false)
        HabitStatus.Attention -> habitProgressColor(true)
        HabitStatus.Incomplete -> colors.onSurfaceVariant
    }
    val fill = row.fill
    val progressColor = habitProgressColor(row.overLimit).copy(alpha = 0.26f)
    val description = stringResource(R.string.habit_tile_status, row.habit.label(), status.label())
    Surface(
        modifier = modifier.aspectRatio(1f).clearAndSetSemantics { contentDescription = description },
        shape = MaterialTheme.shapes.small,
        color = colors.surface,
        border = BorderStroke(1.dp, if (status == HabitStatus.Incomplete) colors.outlineVariant else tint.copy(alpha = 0.45f)),
    ) {
        Column(
            Modifier.fillMaxSize().drawBehind {
                if (fill > 0f) {
                    val height = size.height * fill
                    drawRect(progressColor, topLeft = Offset(0f, size.height - height), size = Size(size.width, height))
                }
            },
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(row.habit.icon, style = type.labelLarge.copy(lineHeight = 16.sp))
            Text(
                when (status) {
                    HabitStatus.OnTrack -> "✓"
                    HabitStatus.Attention -> "×"
                    HabitStatus.Incomplete -> "–"
                },
                color = tint, style = type.labelSmall.copy(lineHeight = 12.sp),
            )
        }
    }
}
