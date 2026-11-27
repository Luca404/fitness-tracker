package it.trackrs.fittrackr.features.meals.habits

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import it.trackrs.fittrackr.R
import it.trackrs.fittrackr.diary.FoodHabit
import it.trackrs.fittrackr.diary.HabitStatus
import it.trackrs.fittrackr.features.meals.mealNumber
import it.trackrs.fittrackr.ui.LocalAppStyle

internal val FoodHabit.icon: String get() = when (this) {
    FoodHabit.Vegetables -> "🥬"
    FoodHabit.Fruit -> "🍎"
    FoodHabit.Legumes -> "🫘"
    FoodHabit.Fish -> "🐟"
    FoodHabit.Fiber -> "🌾"
    FoodHabit.Sugars -> "🍬"
    FoodHabit.Alcohol -> "🍷"
    FoodHabit.Salt -> "🧂"
}

@Composable
internal fun FoodHabit.label() = stringResource(when (this) {
    FoodHabit.Vegetables -> R.string.habit_vegetables
    FoodHabit.Fruit -> R.string.habit_fruit
    FoodHabit.Legumes -> R.string.habit_legumes
    FoodHabit.Fish -> R.string.habit_fish
    FoodHabit.Fiber -> R.string.habit_fiber
    FoodHabit.Sugars -> R.string.habit_sugars
    FoodHabit.Alcohol -> R.string.habit_alcohol
    FoodHabit.Salt -> R.string.habit_salt
})

@Composable
internal fun FoodHabit.amount(value: Double): String {
    val unit = if (this == FoodHabit.Alcohol) R.string.habit_alcohol_units else R.string.meals_grams
    return stringResource(unit, mealNumber(value, 1))
}

@Composable
internal fun HabitStatus.label() = stringResource(when (this) {
    HabitStatus.OnTrack -> R.string.habit_on_track
    HabitStatus.Attention -> R.string.habit_attention
    HabitStatus.Incomplete -> R.string.habit_incomplete
})

@Composable
internal fun habitProgressColor(overLimit: Boolean): Color {
    val light = LocalAppStyle.current.light
    return if (overLimit) {
        if (light) Color(0xFF974400) else Color(0xFFFFB475)
    } else {
        if (light) Color(0xFF17694A) else Color(0xFF6EE7B7)
    }
}
