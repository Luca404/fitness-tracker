package it.trackrs.fittrackr.features.meals

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import it.trackrs.fittrackr.R
import it.trackrs.fittrackr.data.AccountDiary
import it.trackrs.fittrackr.data.DownloadStatus
import it.trackrs.fittrackr.features.meals.habits.HabitSummary
import it.trackrs.fittrackr.diary.mealTimeline
import it.trackrs.fittrackr.ui.LocalAppStyle
import java.time.LocalDate

@Composable
internal fun MealsScreen(
    diary: AccountDiary?,
    today: LocalDate,
    refresh: () -> Unit,
    openHabits: (LocalDate) -> Unit,
) {
    var chosenDate by rememberSaveable { mutableStateOf<String?>(null) }
    var expandedEntry by rememberSaveable { mutableStateOf<String?>(null) }
    val date = chosenDate?.let(LocalDate::parse) ?: today
    val read = observeDiaryDay(diary, date)
    val status = diary?.downloadStatus?.collectAsState()?.value ?: DownloadStatus.Downloading
    val day = read.data
    val groups = remember(day) { day?.meals?.let(::mealTimeline).orEmpty() }
    val style = LocalAppStyle.current

    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        LazyColumn(
            Modifier.widthIn(max = 600.dp).fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item(key = "day") {
                MealDateHeader(date, today) {
                    chosenDate = it.takeUnless { selected -> selected == today }?.toString()
                    expandedEntry = null
                }
            }
            if (day == null) {
                item(key = "download") { DiaryDownloadMessage(status, read.failed, refresh) }
            } else {
                item(key = "summary") { NutritionOverview(day) }
                item(key = "habits") { HabitSummary(day.habits) { openHabits(date) } }
                if (status != DownloadStatus.Ready) {
                    item(key = "update") { DiaryRefreshMessage(status, refresh) }
                }
                if (groups.isEmpty()) {
                    item(key = "empty") {
                        Text(
                            stringResource(R.string.meals_empty),
                            modifier = Modifier.padding(vertical = 12.dp),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    item(key = "meals") {
                        Text(
                            stringResource(R.string.meals_logged),
                            modifier = Modifier.semantics { heading() },
                            style = MaterialTheme.typography.headlineSmall,
                        )
                    }
                    groups.forEach { group ->
                        item(key = "group-${group.entries.first().entry.id}") {
                            MealGroupHeading(group, style)
                        }
                        items(group.entries, key = { "entry-${it.entry.id}" }) { entry ->
                            MealEntryRow(entry, expanded = expandedEntry == entry.entry.id) {
                                expandedEntry = entry.entry.id.takeUnless { it == expandedEntry }
                            }
                        }
                    }
                }
            }
        }
    }
}
