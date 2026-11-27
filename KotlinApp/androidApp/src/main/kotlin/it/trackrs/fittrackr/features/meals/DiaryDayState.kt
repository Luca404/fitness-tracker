package it.trackrs.fittrackr.features.meals

import androidx.compose.runtime.Composable
import androidx.compose.runtime.key
import androidx.compose.runtime.produceState
import it.trackrs.fittrackr.data.AccountDiary
import it.trackrs.fittrackr.data.DiaryDay
import java.time.LocalDate
import kotlinx.coroutines.flow.catch

internal data class DayRead(val data: DiaryDay? = null, val failed: Boolean = false)

@Composable
internal fun observeDiaryDay(diary: AccountDiary?, date: LocalDate): DayRead = key(diary, date) {
    produceState(DayRead()) {
        diary?.local?.observeDay(date.toString(), date.minusDays(6).toString())
            ?.catch { value = DayRead(failed = true) }
            ?.collect { value = DayRead(data = it) }
    }.value
}
