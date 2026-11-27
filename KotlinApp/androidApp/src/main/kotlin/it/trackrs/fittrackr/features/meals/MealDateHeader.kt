package it.trackrs.fittrackr.features.meals

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import it.trackrs.fittrackr.R
import it.trackrs.fittrackr.ui.appContentLocale
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun MealDateHeader(date: LocalDate, today: LocalDate, select: (LocalDate) -> Unit) {
    var calendarOpen by rememberSaveable { mutableStateOf(false) }
    val locale = appContentLocale()
    val weekday = remember(date, locale) {
        date.dayOfWeek.getDisplayName(TextStyle.FULL, locale).replaceFirstChar { it.titlecase(locale) }
    }
    val dateLabel = remember(date, locale) {
        val pattern = android.text.format.DateFormat.getBestDateTimePattern(locale, "dMMMMy")
        date.format(DateTimeFormatter.ofPattern(pattern, locale))
    }
    val colors = MaterialTheme.colorScheme
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = colors.surfaceContainer,
        border = BorderStroke(1.dp, colors.outlineVariant),
    ) {
        Row(
            Modifier.fillMaxWidth().height(IntrinsicSize.Min),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(
                onClick = { select(date.minusDays(1)) },
                modifier = Modifier.width(52.dp).fillMaxHeight(),
            ) {
                Icon(
                    painterResource(R.drawable.ic_chevron), stringResource(R.string.previous_day),
                    Modifier.graphicsLayer { rotationZ = 180f },
                )
            }
            Column(
                Modifier.weight(1f).clickable(
                    onClickLabel = stringResource(R.string.meals_open_calendar),
                    role = Role.Button,
                    onClick = { calendarOpen = true },
                ).heightIn(min = 64.dp).padding(horizontal = 4.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(weekday, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
                Text(
                    dateLabel, style = MaterialTheme.typography.bodyMedium,
                    color = colors.onSurfaceVariant, textAlign = TextAlign.Center,
                )
            }
            IconButton(
                onClick = { select(date.plusDays(1)) }, enabled = date.isBefore(today),
                modifier = Modifier.width(52.dp).fillMaxHeight(),
            ) {
                Icon(painterResource(R.drawable.ic_chevron), stringResource(R.string.next_day))
            }
        }
    }
    if (calendarOpen) {
        val picker = rememberDatePickerState(
            initialSelectedDateMillis = date.toEpochDay() * MILLIS_PER_DAY,
            selectableDates = remember(today) { PastAndToday(today) },
        )
        DatePickerDialog(
            onDismissRequest = { calendarOpen = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        picker.selectedDateMillis?.let { millis ->
                            select(Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate())
                        }
                        calendarOpen = false
                    },
                    enabled = picker.selectedDateMillis != null,
                ) { Text(stringResource(R.string.choose_day)) }
            },
            dismissButton = {
                Row {
                    TextButton(
                        onClick = {
                            select(today)
                            calendarOpen = false
                        },
                    ) { Text(stringResource(R.string.today)) }
                    TextButton(onClick = { calendarOpen = false }) { Text(stringResource(R.string.cancel)) }
                }
            },
        ) {
            DatePicker(picker)
        }
    }
}

private const val MILLIS_PER_DAY = 86_400_000L

@OptIn(ExperimentalMaterial3Api::class)
private class PastAndToday(private val today: LocalDate) : SelectableDates {
    override fun isSelectableDate(utcTimeMillis: Long) = utcTimeMillis <= today.toEpochDay() * MILLIS_PER_DAY
    override fun isSelectableYear(year: Int) = year <= today.year
}
