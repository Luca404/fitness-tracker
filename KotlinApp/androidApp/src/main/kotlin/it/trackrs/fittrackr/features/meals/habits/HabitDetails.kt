package it.trackrs.fittrackr.features.meals.habits

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import it.trackrs.fittrackr.R
import it.trackrs.fittrackr.data.AccountDiary
import it.trackrs.fittrackr.data.DownloadStatus
import it.trackrs.fittrackr.diary.HabitRow
import it.trackrs.fittrackr.features.meals.DiaryDownloadMessage
import it.trackrs.fittrackr.features.meals.mealNumber
import it.trackrs.fittrackr.features.meals.observeDiaryDay
import it.trackrs.fittrackr.ui.PageBody
import it.trackrs.fittrackr.ui.appContentLocale
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

@Composable
internal fun HabitDetails(diary: AccountDiary?, date: LocalDate, refresh: () -> Unit) {
    val read = observeDiaryDay(diary, date)
    val rows = read.data?.habits
    val status = diary?.downloadStatus?.collectAsState()?.value ?: DownloadStatus.Downloading
    val locale = appContentLocale()
    val dateLabel = remember(date, locale) {
        date.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.FULL).withLocale(locale))
            .replaceFirstChar { it.titlecase(locale) }
    }
    PageBody(stringResource(R.string.habits)) {
        if (rows == null) {
            DiaryDownloadMessage(status, read.failed, refresh)
        } else {
            HabitSection(dateLabel, rows.filterNot { it.habit.weekly })
            Spacer(Modifier.height(20.dp))
            HabitSection(stringResource(R.string.habit_last_seven_days), rows.filter { it.habit.weekly })
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun HabitSection(label: String, rows: List<HabitRow>) {
    val columns = if (LocalDensity.current.fontScale > 1.3f) 1 else 2
    Text(
        label, modifier = Modifier.padding(bottom = 8.dp).semantics { heading() },
        style = MaterialTheme.typography.titleMedium,
    )
    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        maxItemsInEachRow = columns,
    ) {
        rows.forEach { row -> HabitDetailCard(row, Modifier.weight(1f)) }
    }
}

@Composable
private fun HabitDetailCard(row: HabitRow, modifier: Modifier) {
    val colors = MaterialTheme.colorScheme
    val type = MaterialTheme.typography
    val progress = habitProgressColor(row.overLimit)
    Surface(modifier, shape = MaterialTheme.shapes.medium, color = colors.surfaceContainer) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(row.habit.icon, Modifier.clearAndSetSemantics {})
                Text(row.habit.label(), style = type.labelLarge, modifier = Modifier.weight(1f))
            }
            val value = row.value
            if (value == null) {
                Text(stringResource(R.string.habit_unknown_value), color = colors.onSurfaceVariant, style = type.bodySmall)
            } else {
                val limit = if (row.habit.maximum) R.string.habit_maximum else R.string.habit_minimum
                val amount = row.habit.amount(value)
                Text(
                    stringResource(
                        R.string.habit_amount_and_target,
                        if (row.partial) stringResource(R.string.habit_partial_amount, amount) else amount,
                        stringResource(limit, row.habit.amount(row.target)),
                    ),
                    color = if (row.overLimit) progress else colors.onSurface, style = type.bodyMedium,
                )
                if (row.partial) Text(stringResource(R.string.habit_partial), color = colors.onSurfaceVariant, style = type.bodySmall)
                if (row.habit.weekly) Text(
                    stringResource(R.string.habit_daily_average, mealNumber(value / 7, 1)),
                    color = colors.onSurfaceVariant, style = type.bodySmall,
                )
                if (row.overLimit) Text(excessLabel(row, value), color = progress, style = type.bodySmall)
            }
            LinearProgressIndicator(
                progress = { row.fill }, modifier = Modifier.fillMaxWidth().height(5.dp),
                color = progress, trackColor = colors.outlineVariant,
            )
        }
    }
}

@Composable
private fun excessLabel(row: HabitRow, value: Double): String {
    if (row.target <= 0) return stringResource(R.string.habit_limit_exceeded)
    val multiple = mealNumber(value / row.target, 1)
    return when {
        multiple == mealNumber(1.0) -> stringResource(R.string.habit_limit_just_over, multiple)
        row.partial -> stringResource(R.string.habit_limit_at_least, multiple)
        else -> stringResource(R.string.habit_limit_multiple, multiple)
    }
}
